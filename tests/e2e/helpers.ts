import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111';

const TEST_USER = {
  email: 'test@mebel-legal-kz.test',
  password: 'Test123456!',
};

let testUserCreated = false;

export async function ensureTestUser(): Promise<void> {
  if (testUserCreated) return;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === TEST_USER.email);

  let userId: string;

  if (!found) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = created!.user!.id;
  } else {
    userId = found.id;
  }

  const { data: existingMembership } = await admin
    .from('organization_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', TEST_ORG_ID)
    .single();

  if (!existingMembership) {
    const { error: memberError } = await admin
      .from('organization_memberships')
      .insert({
        organization_id: TEST_ORG_ID,
        user_id: userId,
        role: 'manager',
        status: 'active',
      });
    if (memberError && memberError.code !== '23505') throw memberError;
  }

  testUserCreated = true;
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app', { timeout: 10000 });
}
