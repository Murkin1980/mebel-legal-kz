import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const importRoute = readFileSync(
  resolve('src/app/api/imports/route.ts'),
  'utf8',
);
const downloadRoute = readFileSync(
  resolve('src/app/app/imports/[id]/download/route.ts'),
  'utf8',
);
const detailPage = readFileSync(
  resolve('src/app/app/imports/[id]/page.tsx'),
  'utf8',
);

describe('archive import workflow security', () => {
  it('scopes history, detail and download lookups to the active tenant', () => {
    expect(downloadRoute).toContain(".eq('status', 'active')");
    expect(downloadRoute).toContain(
      ".eq('organization_id', membership.organization_id)",
    );
    expect(detailPage.match(/\.eq\('organization_id', membership\.organization_id\)/g))
      .toHaveLength(2);
  });

  it('uses a private short-lived signed download instead of a public URL', () => {
    expect(downloadRoute).toContain('.createSignedUrl(batch.storage_path, 60');
    expect(downloadRoute).toContain('{ download: true }');
    expect(downloadRoute).not.toContain('getPublicUrl');
  });

  it('compensates failed writes and keeps a retryable failed batch', () => {
    expect(importRoute).toContain('removeFailedImportArtifacts');
    expect(importRoute).toContain("status: 'failed'");
    expect(importRoute).toContain("existing?.status === 'completed'");
    expect(importRoute).toContain("existing?.status === 'processing'");
    expect(importRoute).toContain("status: 'processing'");
  });

  it('keeps service role code on server routes only', () => {
    expect(importRoute).toContain('createServiceClient');
    expect(downloadRoute).toContain('createServiceClient');
    expect(importRoute).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE');
    expect(downloadRoute).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE');
  });
});
