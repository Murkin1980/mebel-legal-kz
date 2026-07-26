import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const importBucket = 'mebeldocs-imports';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const { data: batch } = await supabase
    .from('organization_import_batches')
    .select('storage_path,status')
    .eq('id', id)
    .eq('organization_id', membership.organization_id)
    .maybeSingle();
  if (!batch?.storage_path || batch.status !== 'completed') {
    return NextResponse.json({ error: 'Архив не найден' }, { status: 404 });
  }

  const admin = await createServiceClient();
  const { data, error } = await admin.storage
    .from(importBucket)
    .createSignedUrl(batch.storage_path, 60, { download: true });
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: 'Не удалось подготовить скачивание' },
      { status: 502 },
    );
  }
  return NextResponse.redirect(data.signedUrl);
}
