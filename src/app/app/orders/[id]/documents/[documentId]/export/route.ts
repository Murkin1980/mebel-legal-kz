import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  orderDocumentExportFilename,
  renderOrderDocumentHtml,
} from '@/modules/orders/document-export';
import { orderService } from '@/modules/orders/order.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();
  if (!membership) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 403 });
  }

  try {
    const workspace = await orderService.getOrderWorkspace(
      membership.organization_id as string,
      id
    );
    const document = workspace.documents.find((item) => item.id === documentId);
    if (
      !document ||
      (document.document_type !== 'invoice' && document.document_type !== 'act')
    ) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }
    const html = renderOrderDocumentHtml(workspace.order, document);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${orderDocumentExportFilename(document)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
  }
}
