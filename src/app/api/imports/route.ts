import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { inspectArchive } from '@/modules/imports/archive';
import { orderService } from '@/modules/orders/order.service';

export const runtime = 'nodejs';
const roles = ['owner', 'manager'];
const toTiyin = (value: string) => {
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
};
const mime = (name: string) => name.endsWith('.pdf') ? 'application/pdf'
  : name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  : name.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  : 'application/octet-stream';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    const { data: membership } = await supabase.from('organization_memberships')
      .select('organization_id,role').eq('user_id',user.id).eq('status','active').limit(1).maybeSingle();
    if (!membership || !roles.includes(membership.role)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    const form = await request.formData();
    const archive = form.get('archive');
    const mode = String(form.get('mode') || 'preview');
    if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Выберите ZIP-архив' }, { status: 400 });
    }
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const preview = inspectArchive(bytes);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2,'0')).join('');
    const orders = [...new Set(preview.rows.map((row) => row.order_number))];
    const summary = { hash, orders: orders.length, documents: preview.rows.length, warnings: preview.warnings, rows: preview.rows };
    if (mode !== 'commit') return NextResponse.json(summary);
    if (preview.warnings.length) return NextResponse.json({ error: 'Исправьте отсутствующие файлы перед импортом', ...summary }, { status: 400 });

    const admin = await createServiceClient();
    const { data: existing } = await admin.from('organization_import_batches').select('id').eq('organization_id',membership.organization_id).eq('archive_sha256',hash).maybeSingle();
    if (existing) return NextResponse.json({ success: true, duplicate: true, batchId: existing.id });
    const bucket = 'mebeldocs-imports';
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((item) => item.id === bucket)) await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: 25 * 1024 * 1024 });
    const storagePath = `${membership.organization_id}/${hash}/${archive.name.replace(/[^A-Za-zА-Яа-яЁё0-9._-]/g,'_')}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, bytes, { contentType: 'application/zip', upsert: false });
    if (uploadError) throw uploadError;
    const { data: batch, error: batchError } = await admin.from('organization_import_batches').insert({
      organization_id: membership.organization_id, archive_name: archive.name, archive_sha256: hash,
      status: 'processing', orders_count: orders.length, documents_count: preview.rows.length,
      warnings: preview.warnings, storage_path: storagePath, created_by: user.id,
    }).select('id').single();
    if (batchError || !batch) throw batchError || new Error('Batch not created');
    const orderIds = new Map<string,string>();
    const documentIds = new Map<string,string>();
    for (const orderNumber of orders) {
      const rows = preview.rows.filter((row) => row.order_number === orderNumber);
      const first = rows[0];
      let orderId: string;
      const { data: existingOrder } = await admin.from('orders').select('id').eq('organization_id',membership.organization_id)
        .eq('source_system','archive').eq('source_order_id',orderNumber).eq('source_order_version',hash).maybeSingle();
      if (existingOrder) orderId = existingOrder.id;
      else {
        const order = await orderService.createOrder({
          orderNumber, title: first.project_title, customerType: 'legal_entity',
          customerDisplayName: first.customer_name, projectType: 'manufacture_delivery_installation',
          totalAmountTiyin: toTiyin(first.amount_kzt), contractRequired: rows.some((row) => row.document_type === 'contract'),
          productionDueDate: first.production_due_date || undefined, deliveryDueDate: first.delivery_due_date || undefined,
          sourceSystem: 'archive', sourceOrderId: orderNumber, sourceOrderVersion: hash,
          items: [{ name: first.project_title, quantity: '1', unit: 'заказ', unitPriceTiyin: toTiyin(first.amount_kzt) }],
        }, membership.organization_id, user.id);
        orderId = order.id;
      }
      orderIds.set(orderNumber, orderId);
      for (const row of rows.filter((item) => item.document_type !== 'other')) {
        const doc = await orderService.createDocument({
          orderId, documentType: row.document_type as 'contract'|'invoice'|'act',
          documentNumber: row.document_number || `${row.document_type.toUpperCase()}-${orderNumber}`,
        }, membership.organization_id, user.id);
        documentIds.set(`${orderNumber}:${row.file_path}`, doc.id);
      }
    }
    const fileRows = preview.rows.map((row) => {
      const file = preview.files.find((item) => item.path === row.file_path)!;
      return { organization_id: membership.organization_id, import_batch_id: batch.id,
        order_id: orderIds.get(row.order_number), order_document_id: documentIds.get(`${row.order_number}:${row.file_path}`) || null,
        archive_path: row.file_path, file_name: file.name, mime_type: mime(file.name.toLowerCase()),
        size_bytes: file.size, document_type: row.document_type };
    });
    const { error: filesError } = await admin.from('organization_import_files').insert(fileRows);
    if (filesError) throw filesError;
    await admin.from('organization_import_batches').update({ status: 'completed' }).eq('id',batch.id);
    await admin.from('audit_events').insert({ organization_id: membership.organization_id, actor_user_id: user.id,
      event_type: 'archive.imported', entity_type: 'organization_import_batch', entity_id: batch.id,
      payload: { archive_sha256: hash, orders_count: orders.length, documents_count: preview.rows.length } });
    return NextResponse.json({ success: true, batchId: batch.id, ...summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка импорта' }, { status: 400 });
  }
}
