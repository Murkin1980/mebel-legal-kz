import { unzipSync } from 'fflate';
import { z } from 'zod';

const rowSchema = z.object({
  order_number: z.string().min(1).max(50),
  customer_name: z.string().min(1).max(255),
  project_title: z.string().min(1).max(500),
  amount_kzt: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/),
  document_type: z.enum(['contract', 'invoice', 'act', 'other']),
  document_number: z.string().max(80).default(''),
  file_path: z.string().min(1).max(500),
  production_due_date: z.string().date().optional().or(z.literal('')),
  delivery_due_date: z.string().date().optional().or(z.literal('')),
});
export type ArchiveManifestRow = z.infer<typeof rowSchema>;
export type ArchivePreview = {
  rows: ArchiveManifestRow[];
  files: { path: string; name: string; size: number }[];
  warnings: string[];
};
const safePath = (value: string) => {
  const path = value.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!path || path.includes('../') || path.includes('\0')) throw new Error(`Недопустимый путь: ${value}`);
  return path;
};
function csv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const split = (line: string) => {
    const out: string[] = []; let value = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted;
      } else if (char === ',' && !quoted) { out.push(value.trim()); value = ''; } else value += char;
    }
    out.push(value.trim()); return out;
  };
  if (lines.length < 2) throw new Error('manifest.csv пуст');
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => {
    const values = split(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}
export function inspectArchive(bytes: Uint8Array): ArchivePreview {
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Архив больше 25 МБ');
  let declaredTotal = 0;
  let declaredFiles = 0;
  const entries = unzipSync(bytes, { filter(file) {
    declaredFiles += 1;
    declaredTotal += file.originalSize;
    if (declaredFiles > 500) throw new Error('В архиве больше 500 файлов');
    if (file.originalSize > 25 * 1024 * 1024 || declaredTotal > 100 * 1024 * 1024) {
      throw new Error('Распакованный архив больше 100 МБ');
    }
    return true;
  }});
  const names = Object.keys(entries);
  if (names.length > 500) throw new Error('В архиве больше 500 файлов');
  let total = 0;
  const files = names.filter((name) => !name.endsWith('/')).map((name) => {
    const path = safePath(name); const size = entries[name].byteLength; total += size;
    return { path, name: path.split('/').at(-1) || path, size };
  });
  if (total > 100 * 1024 * 1024) throw new Error('Распакованный архив больше 100 МБ');
  const manifest = names.find((name) => safePath(name).toLowerCase() === 'manifest.csv');
  if (!manifest) throw new Error('В корне архива требуется manifest.csv');
  const rows = csv(new TextDecoder('utf-8', { fatal: true }).decode(entries[manifest])).map((row, index) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) throw new Error(`Ошибка manifest.csv, строка ${index + 2}`);
    return { ...result.data, file_path: safePath(result.data.file_path) };
  });
  const paths = new Set(files.map((file) => file.path));
  return { rows, files, warnings: rows.filter((row) => !paths.has(row.file_path)).map((row) => `Файл не найден: ${row.file_path}`) };
}
