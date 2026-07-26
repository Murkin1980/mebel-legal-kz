import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountingDocumentData, renderDocx, renderPdf } from '@/modules/orders/document-files';
import { orderService } from '@/modules/orders/order.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const format = new URL(request.url).searchParams.get('format') === 'docx' ? 'docx' : 'pdf';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { data: membership } = await supabase.from('organization_memberships')
    .select('organization_id').eq('user_id', user.id).eq('status', 'active').limit(1).single();
  if (!membership) return NextResponse.json({ error: 'Организация не найдена' }, { status: 403 });

  try {
    const workspace = await orderService.getOrderWorkspace(membership.organization_id as string, id);
    const document = workspace.documents.find((item) => item.id === documentId);
    if (!document || !['invoice', 'act'].includes(document.document_type)) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }
    const data = accountingDocumentData(workspace.order, document, workspace.items, workspace.documentProfile);
    if (!data.supplier) {
      return NextResponse.json({ error: 'Сначала заполните реквизиты компании' }, { status: 409 });
    }
    const file = format === 'docx' ? await renderDocx(data) : await renderPdf(data);
    const body = new Uint8Array(file.byteLength);
    body.set(file);
    const safeNumber = document.document_number.replace(/[^A-Za-zА-Яа-яЁё0-9._-]+/g, '-');
    return new NextResponse(body.buffer, {
      headers: {
        'Content-Type': format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.document_type}-${safeNumber}-v${document.version}.${format}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
  }
}
