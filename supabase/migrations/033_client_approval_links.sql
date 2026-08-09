-- Stage 6: public client approval links and immutable decisions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE approval_public_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  contract_approval_id UUID NOT NULL REFERENCES contract_approvals(id) ON DELETE RESTRICT,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE,
  challenge_hash TEXT NOT NULL,
  challenge_attempts INTEGER NOT NULL DEFAULT 0 CHECK (challenge_attempts >= 0 AND challenge_attempts <= 5),
  challenge_consumed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_command_id UUID UNIQUE,
  command_id UUID NOT NULL UNIQUE,
  UNIQUE(contract_approval_id)
);

CREATE TABLE approval_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  approval_public_link_id UUID NOT NULL REFERENCES approval_public_links(id) ON DELETE RESTRICT,
  contract_approval_id UUID NOT NULL REFERENCES contract_approvals(id) ON DELETE RESTRICT,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_name TEXT CHECK (client_name IS NULL OR char_length(client_name) <= 200),
  client_email TEXT CHECK (client_email IS NULL OR char_length(client_email) <= 320),
  client_ip_hash TEXT,
  user_agent_hash TEXT,
  command_id UUID NOT NULL UNIQUE
);

CREATE UNIQUE INDEX approval_decisions_one_per_link_idx
  ON approval_decisions(approval_public_link_id);

ALTER TABLE approval_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_public_links_no_select ON approval_public_links FOR SELECT USING (false);
CREATE POLICY approval_public_links_no_insert ON approval_public_links FOR INSERT WITH CHECK (false);
CREATE POLICY approval_public_links_no_update ON approval_public_links FOR UPDATE USING (false);
CREATE POLICY approval_public_links_no_delete ON approval_public_links FOR DELETE USING (false);

CREATE POLICY approval_decisions_no_select ON approval_decisions FOR SELECT USING (false);
CREATE POLICY approval_decisions_no_client_write ON approval_decisions FOR INSERT WITH CHECK (false);
CREATE POLICY approval_decisions_no_update ON approval_decisions FOR UPDATE USING (false);
CREATE POLICY approval_decisions_no_delete ON approval_decisions FOR DELETE USING (false);

REVOKE ALL ON approval_public_links, approval_decisions FROM anon, authenticated;
GRANT ALL ON approval_public_links, approval_decisions TO service_role;

CREATE INDEX approval_public_links_token_hash_idx ON approval_public_links(token_hash);
CREATE INDEX approval_decisions_link_idx ON approval_decisions(approval_public_link_id, decided_at);

CREATE OR REPLACE FUNCTION create_client_approval_link(
  p_organization_id UUID, p_contract_approval_id UUID, p_contract_package_id UUID,
  p_token_hash TEXT, p_challenge_hash TEXT, p_expires_at TIMESTAMPTZ,
  p_created_by UUID, p_command_id UUID
) RETURNS approval_public_links
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_link approval_public_links;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id=p_organization_id
    AND user_id=p_created_by AND status='active' AND role IN ('owner','manager')) THEN
    RAISE EXCEPTION 'approval_link_forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM contract_approvals WHERE id=p_contract_approval_id
      AND organization_id=p_organization_id AND contract_package_id=p_contract_package_id
      AND status='pending_review') OR
     NOT EXISTS (SELECT 1 FROM contract_packages WHERE id=p_contract_package_id) THEN
    RAISE EXCEPTION 'approval_link_relation_mismatch';
  END IF;
  SELECT * INTO v_link FROM approval_public_links WHERE command_id = p_command_id;
  IF FOUND THEN RETURN v_link; END IF;
  INSERT INTO approval_public_links (
    organization_id, contract_approval_id, contract_package_id, token_hash,
    challenge_hash, expires_at, created_by, command_id
  ) VALUES (
    p_organization_id, p_contract_approval_id, p_contract_package_id, p_token_hash,
    p_challenge_hash, p_expires_at, p_created_by, p_command_id
  ) RETURNING * INTO v_link;
  INSERT INTO audit_events(organization_id,actor_user_id,event_type,entity_type,entity_id,command_id,payload)
  VALUES (p_organization_id,p_created_by,'approval_public_link.created','approval_public_link',v_link.id,p_command_id,
    jsonb_build_object('contract_approval_id',p_contract_approval_id,'contract_package_id',p_contract_package_id,'expires_at',p_expires_at));
  RETURN v_link;
END $$;

CREATE OR REPLACE FUNCTION revoke_client_approval_link(
  p_link_id UUID, p_revoked_by UUID, p_command_id UUID
) RETURNS approval_public_links
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_link approval_public_links;
BEGIN
  SELECT * INTO v_link FROM approval_public_links WHERE revoked_command_id = p_command_id;
  IF FOUND THEN RETURN v_link; END IF;
  SELECT * INTO v_link FROM approval_public_links WHERE id = p_link_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'approval_link_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id=v_link.organization_id
    AND user_id=p_revoked_by AND status='active' AND role IN ('owner','manager')) THEN
    RAISE EXCEPTION 'approval_link_forbidden';
  END IF;
  IF v_link.status <> 'active' THEN RETURN v_link; END IF;
  UPDATE approval_public_links SET status='revoked', revoked_at=NOW(), revoked_by=p_revoked_by,
    revoked_command_id=p_command_id WHERE id=p_link_id RETURNING * INTO v_link;
  INSERT INTO audit_events(organization_id,actor_user_id,event_type,entity_type,entity_id,command_id,payload)
  VALUES (v_link.organization_id,p_revoked_by,'approval_public_link.revoked','approval_public_link',v_link.id,p_command_id,
    jsonb_build_object('contract_approval_id',v_link.contract_approval_id));
  RETURN v_link;
END $$;

REVOKE ALL ON FUNCTION create_client_approval_link(UUID,UUID,UUID,TEXT,TEXT,TIMESTAMPTZ,UUID,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION revoke_client_approval_link(UUID,UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_client_approval_link(UUID,UUID,UUID,TEXT,TEXT,TIMESTAMPTZ,UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION revoke_client_approval_link(UUID,UUID,UUID) TO service_role;

CREATE OR REPLACE FUNCTION record_client_approval_decision(
  p_token_hash TEXT,
  p_challenge_hash TEXT,
  p_decision TEXT,
  p_comment TEXT,
  p_client_name TEXT,
  p_client_email TEXT,
  p_client_ip_hash TEXT,
  p_user_agent_hash TEXT,
  p_command_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link approval_public_links;
  v_existing approval_decisions;
  v_decision approval_decisions;
BEGIN
  SELECT * INTO v_existing FROM approval_decisions WHERE command_id = p_command_id;
  IF FOUND THEN RETURN jsonb_build_object('decision', to_jsonb(v_existing)); END IF;

  SELECT * INTO v_link FROM approval_public_links
    WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_link.status <> 'active' OR
     (v_link.expires_at IS NOT NULL AND v_link.expires_at <= NOW()) THEN
    RETURN jsonb_build_object('error', 'approval_link_invalid');
  END IF;
  IF v_link.challenge_consumed_at IS NOT NULL OR v_link.challenge_attempts >= 5 THEN
    RETURN jsonb_build_object('error', 'approval_challenge_unavailable');
  END IF;
  IF v_link.challenge_hash <> p_challenge_hash THEN
    UPDATE approval_public_links
      SET challenge_attempts = LEAST(challenge_attempts + 1, 5)
      WHERE id = v_link.id;
    RETURN jsonb_build_object('error', 'approval_challenge_invalid');
  END IF;

  INSERT INTO approval_decisions (
    organization_id, approval_public_link_id, contract_approval_id,
    contract_package_id, decision, comment, client_name, client_email,
    client_ip_hash, user_agent_hash, command_id
  ) VALUES (
    v_link.organization_id, v_link.id, v_link.contract_approval_id,
    v_link.contract_package_id, p_decision, NULLIF(p_comment, ''),
    NULLIF(p_client_name, ''), NULLIF(p_client_email, ''),
    p_client_ip_hash, p_user_agent_hash, p_command_id
  ) RETURNING * INTO v_decision;

  UPDATE approval_public_links SET challenge_consumed_at = NOW() WHERE id = v_link.id;
  INSERT INTO audit_events (
    organization_id, actor_user_id, event_type, entity_type,
    entity_id, command_id, payload
  ) VALUES (
    v_link.organization_id, NULL, 'approval_decision.recorded',
    'approval_decision', v_decision.id, p_command_id,
    jsonb_build_object('approval_public_link_id', v_link.id,
      'contract_package_id', v_link.contract_package_id,
      'decision', p_decision)
  );
  RETURN jsonb_build_object('decision', to_jsonb(v_decision));
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing FROM approval_decisions
      WHERE command_id = p_command_id OR approval_public_link_id = v_link.id
      ORDER BY decided_at LIMIT 1;
    IF FOUND THEN RETURN jsonb_build_object('decision', to_jsonb(v_existing)); END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION record_client_approval_decision(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_client_approval_decision(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;
