-- Stage 02: atomic owner-only membership administration.
CREATE OR REPLACE FUNCTION manage_organization_member(
  p_organization_id uuid,
  p_membership_id uuid,
  p_action text,
  p_role text DEFAULT NULL,
  p_command_id uuid DEFAULT gen_random_uuid()
) RETURNS organization_memberships
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target organization_memberships;
  v_previous jsonb;
  v_event text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id=p_organization_id AND user_id=v_actor
      AND role='owner' AND status='active'
  ) THEN RAISE EXCEPTION 'owner_required'; END IF;

  SELECT * INTO v_target FROM organization_memberships
  WHERE id=p_membership_id AND organization_id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'membership_not_found'; END IF;
  v_previous := jsonb_build_object('role',v_target.role,'status',v_target.status);

  IF p_action='change_role' THEN
    IF p_role IS NULL OR p_role NOT IN ('owner','manager','designer','legal_reviewer','observer')
      THEN RAISE EXCEPTION 'invalid_role'; END IF;
    IF v_target.role='owner' AND v_target.status='active' AND p_role<>'owner'
      AND (SELECT count(*) FROM organization_memberships
           WHERE organization_id=p_organization_id AND role='owner' AND status='active') <= 1
      THEN RAISE EXCEPTION 'last_owner'; END IF;
    UPDATE organization_memberships SET role=p_role WHERE id=p_membership_id RETURNING * INTO v_target;
    v_event := 'member.role_changed';
  ELSIF p_action='disable' THEN
    IF v_target.role='owner' AND v_target.status='active'
      AND (SELECT count(*) FROM organization_memberships
           WHERE organization_id=p_organization_id AND role='owner' AND status='active') <= 1
      THEN RAISE EXCEPTION 'last_owner'; END IF;
    UPDATE organization_memberships SET status='disabled' WHERE id=p_membership_id RETURNING * INTO v_target;
    v_event := 'member.disabled';
  ELSIF p_action='restore' THEN
    UPDATE organization_memberships SET status='active' WHERE id=p_membership_id RETURNING * INTO v_target;
    v_event := 'member.restored';
  ELSE RAISE EXCEPTION 'invalid_action';
  END IF;

  INSERT INTO audit_events(organization_id,actor_user_id,event_type,entity_type,entity_id,command_id,payload)
  VALUES(p_organization_id,v_actor,v_event,'organization_membership',p_membership_id,p_command_id,
    jsonb_build_object('previous',v_previous,'next',jsonb_build_object('role',v_target.role,'status',v_target.status)));
  RETURN v_target;
END $$;

REVOKE ALL ON FUNCTION manage_organization_member(uuid,uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION manage_organization_member(uuid,uuid,text,text,uuid) TO authenticated;
