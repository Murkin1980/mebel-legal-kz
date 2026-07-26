import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { inspectArchive } from '@/modules/imports/archive';
import { orderService } from '@/modules/orders/order.service';

export const runtime = 'nodejs';

const allowedRoles = ['owner', 'manager'];
const importBucket = 'mebeldocs-imports';
type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

const toTiyin = (value: string) => {
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
};

const mimeType = (name: string) =>
  name.endsWith('.pdf')
    ? 'application/pdf'
    : name.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : name.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';

async function removeFailedImportArtifacts(
  admin: ServiceClient,
  organizationId: string,
  archiveHash: string,
  batchId: string,
  storagePath: string | null,
) {
  const { error: filesError } = await admin
    .from('organization_import_files')
    .delete()
    .eq('organization_id', organizationId)
    .eq('import_batch_id', batchId);
  if (filesError) throw filesError;
  const { error: ordersError } = await admin
    .from('orders')
    .delete()
    .eq('organization_id', organizationId)
    .eq('source_system', 'archive')
    .eq('source_order_version', archiveHash);
  if (ordersError) throw ordersError;
  if (storagePath) {
    const { error: storageError } = await admin.storage
      .from(importBucket)
      .remove([storagePath]);
    if (storageError) throw storageError;
  }
}

export async function POST(request: Request) {
  let admin: ServiceClient | null = null;
  let organizationId: string | null = null;
  let actorUserId: string | null = null;
  let batchId: string | null = null;
  let archiveHash: string | null = null;
  let storagePath: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('organization_id,role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (!membership || !allowedRoles.includes(membership.role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const form = await request.formData();
    const archive = form.get('archive');
    const mode = String(form.get('mode') || 'preview');
    if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Выберите ZIP-архив' }, { status: 400 });
    }

    const bytes = new Uint8Array(await archive.arrayBuffer());
    const preview = inspectArchive(bytes);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    archiveHash = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    const orderNumbers = [...new Set(preview.rows.map((row) => row.order_number))];
    const summary = {
      hash: archiveHash,
      orders: orderNumbers.length,
      documents: preview.rows.length,
      warnings: preview.warnings,
      rows: preview.rows,
    };

    if (mode !== 'commit') return NextResponse.json(summary);
    if (preview.warnings.length) {
      return NextResponse.json(
        {
          error: 'Исправьте отсутствующие файлы перед импортом',
          ...summary,
        },
        { status: 400 },
      );
    }

    admin = await createServiceClient();
    organizationId = membership.organization_id;
    actorUserId = user.id;
    const currentOrganizationId = membership.organization_id;
    const currentActorUserId = user.id;
    const currentArchiveHash = archiveHash!;

    const { data: existing, error: existingError } = await admin
      .from('organization_import_batches')
      .select('id,status,storage_path')
      .eq('organization_id', currentOrganizationId)
      .eq('archive_sha256', currentArchiveHash)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.status === 'completed') {
      return NextResponse.json({
        success: true,
        duplicate: true,
        batchId: existing.id,
      });
    }
    if (existing?.status === 'processing') {
      return NextResponse.json(
        { error: 'Этот архив уже обрабатывается', batchId: existing.id },
        { status: 409 },
      );
    }

    if (existing) {
      batchId = existing.id;
      await removeFailedImportArtifacts(
        admin,
        currentOrganizationId,
        currentArchiveHash,
        existing.id,
        existing.storage_path,
      );
      const { error: retryError } = await admin
        .from('organization_import_batches')
        .update({
          archive_name: archive.name,
          status: 'processing',
          orders_count: orderNumbers.length,
          documents_count: preview.rows.length,
          warnings: [],
          storage_path: null,
          created_by: actorUserId,
        })
        .eq('id', batchId)
        .eq('organization_id', currentOrganizationId);
      if (retryError) throw retryError;
    } else {
      const { data: batch, error: batchError } = await admin
        .from('organization_import_batches')
        .insert({
          organization_id: currentOrganizationId,
          archive_name: archive.name,
          archive_sha256: currentArchiveHash,
          status: 'processing',
          orders_count: orderNumbers.length,
          documents_count: preview.rows.length,
          warnings: [],
          storage_path: null,
          created_by: currentActorUserId,
        })
        .select('id')
        .single();
      if (batchError || !batch) {
        throw batchError || new Error('Не удалось создать партию импорта');
      }
      batchId = batch.id;
    }

    const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
    if (bucketsError) throw bucketsError;
    if (!buckets?.some((item) => item.id === importBucket)) {
      const { error: bucketError } = await admin.storage.createBucket(importBucket, {
        public: false,
        fileSizeLimit: 25 * 1024 * 1024,
      });
      if (bucketError) throw bucketError;
    }

    const safeArchiveName = archive.name.replace(
      /[^A-Za-zА-Яа-яЁё0-9._-]/g,
      '_',
    );
    storagePath = `${currentOrganizationId}/${currentArchiveHash}/${safeArchiveName}`;
    const { error: uploadError } = await admin.storage
      .from(importBucket)
      .upload(storagePath, bytes, {
        contentType: 'application/zip',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: storageUpdateError } = await admin
      .from('organization_import_batches')
      .update({ storage_path: storagePath })
      .eq('id', batchId)
      .eq('organization_id', currentOrganizationId);
    if (storageUpdateError) throw storageUpdateError;

    const orderIds = new Map<string, string>();
    const documentIds = new Map<string, string>();
    for (const orderNumber of orderNumbers) {
      const rows = preview.rows.filter(
        (row) => row.order_number === orderNumber,
      );
      const first = rows[0];
      const order = await orderService.createOrder(
        {
          orderNumber,
          title: first.project_title,
          customerType: 'legal_entity',
          customerDisplayName: first.customer_name,
          projectType: 'manufacture_delivery_installation',
          totalAmountTiyin: toTiyin(first.amount_kzt),
          contractRequired: rows.some(
            (row) => row.document_type === 'contract',
          ),
          productionDueDate: first.production_due_date || undefined,
          deliveryDueDate: first.delivery_due_date || undefined,
          sourceSystem: 'archive',
          sourceOrderId: orderNumber,
          sourceOrderVersion: currentArchiveHash,
          items: [
            {
              name: first.project_title,
              quantity: '1',
              unit: 'заказ',
              unitPriceTiyin: toTiyin(first.amount_kzt),
            },
          ],
        },
        currentOrganizationId,
        currentActorUserId,
        crypto.randomUUID(),
      );
      orderIds.set(orderNumber, order.id);

      for (const row of rows.filter((item) => item.document_type !== 'other')) {
        const document = await orderService.createDocument(
          {
            orderId: order.id,
            documentType: row.document_type as 'contract' | 'invoice' | 'act',
            documentNumber:
              row.document_number ||
              `${row.document_type.toUpperCase()}-${orderNumber}`,
          },
          currentOrganizationId,
          currentActorUserId,
          crypto.randomUUID(),
        );
        documentIds.set(`${orderNumber}:${row.file_path}`, document.id);
      }
    }

    const fileRows = preview.rows.map((row) => {
      const file = preview.files.find((item) => item.path === row.file_path);
      if (!file) throw new Error(`Файл не найден: ${row.file_path}`);
      return {
        organization_id: currentOrganizationId,
        import_batch_id: batchId,
        order_id: orderIds.get(row.order_number),
        order_document_id:
          documentIds.get(`${row.order_number}:${row.file_path}`) || null,
        archive_path: row.file_path,
        file_name: file.name,
        mime_type: mimeType(file.name.toLowerCase()),
        size_bytes: file.size,
        document_type: row.document_type,
      };
    });
    const { error: filesError } = await admin
      .from('organization_import_files')
      .insert(fileRows);
    if (filesError) throw filesError;

    const { error: completedError } = await admin
      .from('organization_import_batches')
      .update({ status: 'completed' })
      .eq('id', batchId)
      .eq('organization_id', currentOrganizationId);
    if (completedError) throw completedError;

    const { error: auditError } = await admin.from('audit_events').insert({
      organization_id: currentOrganizationId,
      actor_user_id: currentActorUserId,
      event_type: 'archive.imported',
      entity_type: 'organization_import_batch',
      entity_id: batchId,
      command_id: crypto.randomUUID(),
      idempotency_key: `archive-import:${currentOrganizationId}:${currentArchiveHash}`,
      payload: {
        archive_sha256: currentArchiveHash,
        orders_count: orderNumbers.length,
        documents_count: preview.rows.length,
      },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ success: true, batchId, ...summary });
  } catch (error) {
    if (admin && organizationId && batchId && archiveHash) {
      try {
        await removeFailedImportArtifacts(
          admin,
          organizationId,
          archiveHash,
          batchId,
          storagePath,
        );
      } catch {
        // Preserve the original failure; the failed batch remains visible for
        // operator review even if best-effort compensation needs intervention.
      }
      await admin
        .from('organization_import_batches')
        .update({
          status: 'failed',
          storage_path: null,
          warnings: [
            error instanceof Error ? error.message : 'Ошибка импорта',
          ],
        })
        .eq('id', batchId)
        .eq('organization_id', organizationId);
      if (actorUserId) {
        await admin.from('audit_events').insert({
          organization_id: organizationId,
          actor_user_id: actorUserId,
          event_type: 'archive.import_failed',
          entity_type: 'organization_import_batch',
          entity_id: batchId,
          command_id: crypto.randomUUID(),
          payload: { archive_sha256: archiveHash },
        });
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка импорта' },
      { status: 400 },
    );
  }
}
