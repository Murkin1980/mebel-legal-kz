import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { inspectArchive } from '@/modules/imports/archive';

const manifest = [
  'order_number,customer_name,project_title,amount_kzt,document_type,document_number,file_path,production_due_date,delivery_due_date',
  'ORD-1,ТОО Тест,Кухня Терра,1200000,invoice,INV-1,ORD-1/invoice.pdf,2026-08-10,2026-08-15',
].join('\n');

describe('archive import', () => {
  it('parses a safe archive and manifest', () => {
    const archive = zipSync({
      'manifest.csv': strToU8(manifest),
      'ORD-1/invoice.pdf': strToU8('%PDF synthetic fixture'),
    });
    const result = inspectArchive(archive);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].order_number).toBe('ORD-1');
    expect(result.warnings).toEqual([]);
  });

  it('reports a manifest file missing from the archive', () => {
    const result = inspectArchive(zipSync({ 'manifest.csv': strToU8(manifest) }));
    expect(result.warnings).toEqual(['Файл не найден: ORD-1/invoice.pdf']);
  });

  it('rejects an archive without a manifest', () => {
    expect(() => inspectArchive(zipSync({ 'file.pdf': strToU8('fixture') })))
      .toThrow('manifest.csv');
  });

  it('rejects path traversal', () => {
    expect(() => inspectArchive(zipSync({
      'manifest.csv': strToU8(manifest),
      '../invoice.pdf': strToU8('fixture'),
    }))).toThrow('Недопустимый путь');
  });
});
