-- Pilot archive imports. Additive only.
CREATE TABLE organization_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  archive_name TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing','completed','failed')),
  orders_count INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  documents_count INTEGER NOT NULL DEFAULT 0 CHECK (documents_count >= 0),
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, archive_sha256)
);
CREATE TABLE organization_import_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_batch_id UUID NOT NULL REFERENCES organization_import_batches(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_document_id UUID REFERENCES order_documents(id) ON DELETE SET NULL,
  archive_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  document_type TEXT CHECK (document_type IN ('contract','invoice','act','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (import_batch_id, archive_path)
);
ALTER TABLE organization_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_import_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_batches_select" ON organization_import_batches FOR SELECT TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id=(SELECT auth.uid()) AND status='active')
);
CREATE POLICY "import_files_select" ON organization_import_files FOR SELECT TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id=(SELECT auth.uid()) AND status='active')
);
REVOKE ALL ON organization_import_batches, organization_import_files FROM anon, authenticated;
GRANT SELECT ON organization_import_batches, organization_import_files TO authenticated;
GRANT ALL ON organization_import_batches, organization_import_files TO service_role;
CREATE INDEX idx_import_batches_org_created ON organization_import_batches(organization_id,created_at DESC);
CREATE INDEX idx_import_files_batch ON organization_import_files(import_batch_id,archive_path);
