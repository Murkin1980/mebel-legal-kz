-- Close inherited anonymous execution on the order workflow RPCs.
-- Additive and reversible: authenticated access remains unchanged.

REVOKE ALL ON FUNCTION public.create_order_with_audit(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_audit(UUID, UUID, UUID, JSONB) FROM anon;

REVOKE ALL ON FUNCTION public.create_order_document_with_audit(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_document_with_audit(UUID, UUID, UUID, JSONB) FROM anon;

REVOKE ALL ON FUNCTION public.create_order_deadline_with_audit(UUID, UUID, UUID, JSONB, DATE[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_deadline_with_audit(UUID, UUID, UUID, JSONB, DATE[]) FROM anon;

REVOKE ALL ON FUNCTION public.save_organization_document_profile_with_audit(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_organization_document_profile_with_audit(UUID, UUID, UUID, JSONB) FROM anon;
