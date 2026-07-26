import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/imports/template/route';
import { inspectArchive } from '@/modules/imports/archive';

describe('import archive template', () => {
  it('downloads a valid ZIP that passes the same archive preflight', async () => {
    const response = await GET();
    const archive = new Uint8Array(await response.arrayBuffer());
    const preview = inspectArchive(archive);

    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(preview.warnings).toEqual([]);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows.map((row) => row.document_type)).toEqual([
      'invoice',
      'act',
    ]);
  });
});
