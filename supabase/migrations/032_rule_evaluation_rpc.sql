CREATE OR REPLACE FUNCTION persist_contract_package_check(
  p_organization_id UUID, p_legal_case_id UUID, p_contract_package_id UUID,
  p_package_version INTEGER, p_status TEXT, p_summary JSONB,
  p_results JSONB, p_evaluated_by UUID, p_command_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_check JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organization_memberships
    WHERE organization_id=p_organization_id AND user_id=p_evaluated_by
      AND status='active' AND role IN ('owner','manager','legal_reviewer')) THEN
    RAISE EXCEPTION 'rule_evaluation_forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM legal_cases WHERE id=p_legal_case_id AND organization_id=p_organization_id) OR
     NOT EXISTS (SELECT 1 FROM contract_packages WHERE id=p_contract_package_id
       AND legal_case_id=p_legal_case_id AND version=p_package_version) THEN
    RAISE EXCEPTION 'rule_evaluation_tenant_mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_results) x
    LEFT JOIN legal_rules r ON r.id=(x->>'rule_id')::UUID
    LEFT JOIN legal_source_revisions sr ON sr.id=(x->>'source_revision_id')::UUID
    WHERE r.id IS NULL OR r.organization_id<>p_organization_id OR r.status<>'approved'
      OR sr.id IS NULL OR sr.id<>r.source_revision_id OR sr.status<>'approved'
  ) THEN RAISE EXCEPTION 'rule_evaluation_unapproved_rule'; END IF;
  IF EXISTS (SELECT 1 FROM contract_package_checks WHERE command_id = p_command_id) THEN
    SELECT to_jsonb(c) INTO v_check FROM contract_package_checks c WHERE c.command_id = p_command_id;
    RETURN jsonb_build_object('check', v_check, 'duplicate', true);
  END IF;
  INSERT INTO contract_rule_evaluations
    (organization_id,legal_case_id,contract_package_id,package_version,rule_id,source_revision_id,result,code,message,evidence,evaluated_by,command_id)
  SELECT p_organization_id,p_legal_case_id,p_contract_package_id,p_package_version,
    (x->>'rule_id')::UUID,(x->>'source_revision_id')::UUID,x->>'result',x->>'code',x->>'message',COALESCE(x->'evidence','{}'),p_evaluated_by,p_command_id
  FROM jsonb_array_elements(p_results) x;
  INSERT INTO contract_package_checks
    (organization_id,legal_case_id,contract_package_id,package_version,status,summary,evaluated_by,command_id)
  VALUES (p_organization_id,p_legal_case_id,p_contract_package_id,p_package_version,p_status,p_summary,p_evaluated_by,p_command_id)
  RETURNING to_jsonb(contract_package_checks.*) INTO v_check;
  INSERT INTO audit_events(organization_id,actor_user_id,event_type,entity_type,entity_id,command_id,payload)
  VALUES (p_organization_id,p_evaluated_by,'contract_package.checked','contract_package',p_contract_package_id,p_command_id,
    jsonb_build_object('package_version',p_package_version,'status',p_status,'summary',p_summary));
  RETURN jsonb_build_object('check', v_check, 'duplicate', false);
END $$;
REVOKE ALL ON FUNCTION persist_contract_package_check(UUID,UUID,UUID,INTEGER,TEXT,JSONB,JSONB,UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION persist_contract_package_check(UUID,UUID,UUID,INTEGER,TEXT,JSONB,JSONB,UUID,UUID) TO service_role;
