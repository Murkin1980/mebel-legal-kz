import { zipSync, strToU8 } from 'fflate';

export const runtime = 'nodejs';

const manifest = [
  'order_number,customer_name,project_title,amount_kzt,document_type,document_number,file_path,production_due_date,delivery_due_date',
  'DEMO-001,Тестовый клиент,Кухонный гарнитур,1500000.00,invoice,DEMO-SF-001,documents/demo-invoice.txt,2026-08-15,2026-08-25',
  'DEMO-001,Тестовый клиент,Кухонный гарнитур,1500000.00,act,DEMO-ACT-001,documents/demo-act.txt,2026-08-15,2026-08-25',
].join('\n');

const readme = [
  'MebelDocs AI — шаблон импорта',
  '',
  '1. Замените демонстрационные значения в manifest.csv.',
  '2. Положите документы по путям из колонки file_path.',
  '3. Разрешённые типы: contract, invoice, act, other.',
  '4. Не меняйте названия колонок.',
  '5. Удалите демонстрационные файлы перед рабочим импортом.',
].join('\n');

export async function GET() {
  const archive = zipSync({
    'manifest.csv': strToU8(`\uFEFF${manifest}`),
    'README.txt': strToU8(readme),
    'documents/demo-invoice.txt': strToU8('Демонстрационный счёт'),
    'documents/demo-act.txt': strToU8('Демонстрационный акт'),
  });
  return new Response(archive, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        'attachment; filename="mebeldocs-import-template.zip"',
      'Cache-Control': 'private, no-store',
    },
  });
}
