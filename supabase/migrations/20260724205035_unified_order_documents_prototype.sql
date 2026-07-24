-- Unified order/document workflow prototype.
-- Additive only: no legacy tables, policies, or data are changed.

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (
    customer_type IN ('individual', 'individual_entrepreneur', 'legal_entity')
  ),
  customer_display_name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (
    project_type IN (
      'manufacture_only',
      'manufacture_delivery',
      'manufacture_delivery_installation'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'confirmed', 'closed', 'cancelled')
  ),
  currency TEXT NOT NULL DEFAULT 'KZT' CHECK (currency = 'KZT'),
  total_amount_tiyin BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_tiyin >= 0),
  contract_required BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'manual',
  source_order_id TEXT,
  source_order_version TEXT,
  legacy_legal_case_id UUID REFERENCES legal_cases(id) ON DELETE SET NULL,
  production_due_date DATE,
  delivery_due_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, order_number)
);

CREATE UNIQUE INDEX idx_orders_external_source
  ON orders(organization_id, source_system, source_order_id, source_order_version)
  WHERE source_order_id IS NOT NULL AND source_order_version IS NOT NULL;

CREATE TABLE order_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'invoice', 'act')),
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'void')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  amount_tiyin BIGINT CHECK (amount_tiyin IS NULL OR amount_tiyin >= 0),
  currency TEXT NOT NULL DEFAULT 'KZT' CHECK (currency = 'KZT'),
  contract_package_id UUID REFERENCES contract_packages(id) ON DELETE SET NULL,
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, document_type, document_number, version)
);

CREATE TABLE order_deadlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_document_id UUID REFERENCES order_documents(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('payment', 'production', 'delivery', 'installation', 'act_return', 'custom')
  ),
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  working_days_offset INTEGER NOT NULL DEFAULT 0 CHECK (working_days_offset >= 0),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE order_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES order_deadlines(id) ON DELETE CASCADE,
  remind_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'completed', 'dismissed')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deadline_id, remind_on)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON orders
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "order_documents_select" ON order_documents
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "order_documents_insert" ON order_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'legal_reviewer')
        AND status = 'active'
    )
    AND order_id IN (
      SELECT id FROM orders WHERE orders.organization_id = order_documents.organization_id
    )
  );

CREATE POLICY "order_documents_update" ON order_documents
  FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'legal_reviewer')
        AND status = 'active'
    )
  )
  WITH CHECK (
    status IN ('draft', 'final', 'void')
    AND organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "order_documents_delete" ON order_documents
  FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "order_deadlines_select" ON order_deadlines
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "order_deadlines_insert" ON order_deadlines
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
    AND order_id IN (
      SELECT id FROM orders WHERE orders.organization_id = order_deadlines.organization_id
    )
  );

CREATE POLICY "order_deadlines_update" ON order_deadlines
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "order_deadlines_delete" ON order_deadlines
  FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "order_reminders_select" ON order_reminders
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "order_reminders_insert" ON order_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
    AND deadline_id IN (
      SELECT id FROM order_deadlines
      WHERE order_deadlines.organization_id = order_reminders.organization_id
    )
  );

CREATE POLICY "order_reminders_update" ON order_reminders
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager', 'designer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "order_reminders_delete" ON order_reminders
  FOR DELETE TO authenticated USING (FALSE);

REVOKE ALL ON orders, order_documents, order_deadlines, order_reminders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_deadlines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_reminders TO authenticated;
GRANT ALL ON orders, order_documents, order_deadlines, order_reminders TO service_role;

CREATE INDEX idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX idx_orders_org_created ON orders(organization_id, created_at DESC);
CREATE INDEX idx_order_documents_order ON order_documents(order_id, created_at DESC);
CREATE INDEX idx_order_documents_org_type ON order_documents(organization_id, document_type);
CREATE INDEX idx_order_deadlines_order_due ON order_deadlines(order_id, due_date);
CREATE INDEX idx_order_deadlines_org_status ON order_deadlines(organization_id, status, due_date);
CREATE INDEX idx_order_reminders_org_date ON order_reminders(organization_id, status, remind_on);

-- Atomic write commands. Each function writes the business entity and its
-- append-only audit event in the same PostgreSQL transaction.

CREATE OR REPLACE FUNCTION create_order_with_audit(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_command_id UUID,
  p_order JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_existing_entity_id UUID;
BEGIN
  IF p_actor_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager', 'designer', 'operations')
  ) THEN
    RAISE EXCEPTION 'insufficient order permissions' USING ERRCODE = '42501';
  END IF;

  SELECT entity_id INTO v_existing_entity_id
  FROM audit_events
  WHERE organization_id = p_organization_id AND command_id = p_command_id;
  IF v_existing_entity_id IS NOT NULL THEN
    SELECT * INTO v_order FROM orders
    WHERE id = v_existing_entity_id AND organization_id = p_organization_id;
    RETURN to_jsonb(v_order);
  END IF;

  INSERT INTO orders (
    organization_id, order_number, title, customer_type, customer_display_name,
    project_type, total_amount_tiyin, contract_required, production_due_date,
    delivery_due_date, source_system, source_order_id, source_order_version,
    legacy_legal_case_id, created_by
  ) VALUES (
    p_organization_id,
    p_order->>'order_number',
    p_order->>'title',
    p_order->>'customer_type',
    p_order->>'customer_display_name',
    p_order->>'project_type',
    (p_order->>'total_amount_tiyin')::BIGINT,
    COALESCE((p_order->>'contract_required')::BOOLEAN, FALSE),
    NULLIF(p_order->>'production_due_date', '')::DATE,
    NULLIF(p_order->>'delivery_due_date', '')::DATE,
    COALESCE(NULLIF(p_order->>'source_system', ''), 'manual'),
    NULLIF(p_order->>'source_order_id', ''),
    NULLIF(p_order->>'source_order_version', ''),
    NULLIF(p_order->>'legacy_legal_case_id', '')::UUID,
    p_actor_user_id
  ) RETURNING * INTO v_order;

  INSERT INTO audit_events (
    organization_id, actor_user_id, event_type, entity_type, entity_id,
    command_id, idempotency_key, payload
  ) VALUES (
    p_organization_id, p_actor_user_id, 'order.created', 'order', v_order.id,
    p_command_id, p_command_id::TEXT,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'customer_type', v_order.customer_type,
      'project_type', v_order.project_type,
      'contract_required', v_order.contract_required,
      'total_amount_tiyin', v_order.total_amount_tiyin
    )
  );
  RETURN to_jsonb(v_order);
END;
$$;

CREATE OR REPLACE FUNCTION create_order_document_with_audit(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_command_id UUID,
  p_document JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_document order_documents%ROWTYPE;
  v_version INTEGER;
  v_amount BIGINT;
BEGIN
  IF p_actor_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager', 'designer', 'legal_reviewer')
  ) THEN
    RAISE EXCEPTION 'insufficient document permissions' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_document FROM order_documents
  WHERE id = (
    SELECT entity_id FROM audit_events
    WHERE organization_id = p_organization_id AND command_id = p_command_id
  );
  IF FOUND THEN RETURN to_jsonb(v_document); END IF;

  SELECT * INTO v_order FROM orders
  WHERE id = (p_document->>'order_id')::UUID
    AND organization_id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id::TEXT || ':' || p_document->>'document_type' || ':' ||
      p_document->>'document_number',
      0
    )
  );
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM order_documents
  WHERE organization_id = p_organization_id
    AND document_type = p_document->>'document_type'
    AND document_number = p_document->>'document_number';
  v_amount := COALESCE(
    NULLIF(p_document->>'amount_tiyin', '')::BIGINT,
    v_order.total_amount_tiyin
  );

  INSERT INTO order_documents (
    organization_id, order_id, document_type, document_number, version,
    amount_tiyin, contract_package_id, content_snapshot, created_by
  ) VALUES (
    p_organization_id,
    v_order.id,
    p_document->>'document_type',
    p_document->>'document_number',
    v_version,
    CASE WHEN p_document->>'document_type' = 'contract'
      THEN NULLIF(p_document->>'amount_tiyin', '')::BIGINT ELSE v_amount END,
    NULLIF(p_document->>'contract_package_id', '')::UUID,
    jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'order_title', v_order.title,
      'customer_display_name', v_order.customer_display_name,
      'amount_tiyin', v_amount,
      'currency', v_order.currency,
      'contract_optional', TRUE
    ),
    p_actor_user_id
  ) RETURNING * INTO v_document;

  INSERT INTO audit_events (
    organization_id, actor_user_id, event_type, entity_type, entity_id,
    command_id, idempotency_key, payload
  ) VALUES (
    p_organization_id, p_actor_user_id,
    'order_document.' || v_document.document_type || '.created',
    'order_document', v_document.id, p_command_id, p_command_id::TEXT,
    jsonb_build_object(
      'order_id', v_order.id,
      'document_type', v_document.document_type,
      'document_number', v_document.document_number,
      'version', v_document.version
    )
  );
  RETURN to_jsonb(v_document);
END;
$$;

CREATE OR REPLACE FUNCTION create_order_deadline_with_audit(
  p_organization_id UUID,
  p_actor_user_id UUID,
  p_command_id UUID,
  p_deadline JSONB,
  p_remind_on DATE[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline order_deadlines%ROWTYPE;
  v_reminders JSONB;
BEGIN
  IF p_actor_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'manager', 'designer', 'operations')
  ) THEN
    RAISE EXCEPTION 'insufficient deadline permissions' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_deadline FROM order_deadlines
  WHERE id = (
    SELECT entity_id FROM audit_events
    WHERE organization_id = p_organization_id AND command_id = p_command_id
  );
  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.remind_on), '[]'::jsonb)
      INTO v_reminders
    FROM order_reminders r WHERE r.deadline_id = v_deadline.id;
    RETURN jsonb_build_object('deadline', to_jsonb(v_deadline), 'reminders', v_reminders);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id = (p_deadline->>'order_id')::UUID
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO order_deadlines (
    organization_id, order_id, order_document_id, kind, title, due_date,
    working_days_offset, created_by
  ) VALUES (
    p_organization_id,
    (p_deadline->>'order_id')::UUID,
    NULLIF(p_deadline->>'order_document_id', '')::UUID,
    p_deadline->>'kind',
    p_deadline->>'title',
    (p_deadline->>'due_date')::DATE,
    COALESCE((p_deadline->>'working_days_offset')::INTEGER, 0),
    p_actor_user_id
  ) RETURNING * INTO v_deadline;

  INSERT INTO order_reminders (organization_id, deadline_id, remind_on)
  SELECT p_organization_id, v_deadline.id, value
  FROM unnest(p_remind_on) AS value;

  INSERT INTO audit_events (
    organization_id, actor_user_id, event_type, entity_type, entity_id,
    command_id, idempotency_key, payload
  ) VALUES (
    p_organization_id, p_actor_user_id, 'order.deadline.created',
    'order_deadline', v_deadline.id, p_command_id, p_command_id::TEXT,
    jsonb_build_object(
      'order_id', v_deadline.order_id,
      'kind', v_deadline.kind,
      'due_date', v_deadline.due_date,
      'reminder_count', cardinality(p_remind_on)
    )
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.remind_on), '[]'::jsonb)
    INTO v_reminders
  FROM order_reminders r WHERE r.deadline_id = v_deadline.id;
  RETURN jsonb_build_object('deadline', to_jsonb(v_deadline), 'reminders', v_reminders);
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_audit(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_order_document_with_audit(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_order_deadline_with_audit(UUID, UUID, UUID, JSONB, DATE[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_audit(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_document_with_audit(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_deadline_with_audit(UUID, UUID, UUID, JSONB, DATE[]) TO authenticated;
