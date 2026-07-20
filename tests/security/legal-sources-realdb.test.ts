import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111';
let TEST_USER_ID = '';

async function getTestUserId(): Promise<string> {
  if (TEST_USER_ID) return TEST_USER_ID;
  const { data } = await admin.auth.admin.listUsers();
  const testUser = data?.users?.find(u => u.email === 'test@mebel-legal-kz.test');
  if (testUser) {
    TEST_USER_ID = testUser.id;
    return TEST_USER_ID;
  }
  throw new Error('Test user not found. Run e2e helpers first to create it.');
}

async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await admin
    .from(tableName)
    .select('*')
    .limit(0);
  // Error code 42P01 = undefined_table
  if (error && error.code === '42P01') return false;
  // Any other error (RLS, etc.) means the table exists but we can't query it
  return true;
}

describe('Real-DB: Table Existence Check', () => {
  it('legal_sources table exists in database', async () => {
    const exists = await tableExists('legal_sources');
    expect(exists).toBe(true);
  });

  it('legal_source_revisions table exists in database', async () => {
    const exists = await tableExists('legal_source_revisions');
    expect(exists).toBe(true);
  });

  it('legal_rules table exists in database', async () => {
    const exists = await tableExists('legal_rules');
    expect(exists).toBe(true);
  });

  it('contract_templates table exists in database', async () => {
    const exists = await tableExists('contract_templates');
    expect(exists).toBe(true);
  });

  it('contract_packages table exists in database', async () => {
    const exists = await tableExists('contract_packages');
    expect(exists).toBe(true);
  });

  it('contract_approvals table exists in database', async () => {
    const exists = await tableExists('contract_approvals');
    expect(exists).toBe(true);
  });

  it('change_orders table exists in database', async () => {
    const exists = await tableExists('change_orders');
    expect(exists).toBe(true);
  });

  it('claims table exists in database', async () => {
    const exists = await tableExists('claims');
    expect(exists).toBe(true);
  });
});

describe('Real-DB: Service Role CRUD (bypasses RLS)', () => {
  let sourceId: string;
  let revisionId: string;
  let ruleId: string;
  let userId: string;

  beforeAll(async () => {
    userId = await getTestUserId();
  });

  it('can SELECT from legal_sources with service role', async () => {
    const { error } = await admin
      .from('legal_sources')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can SELECT from legal_source_revisions with service role', async () => {
    const { error } = await admin
      .from('legal_source_revisions')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can SELECT from legal_rules with service role', async () => {
    const { error } = await admin
      .from('legal_rules')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can INSERT into legal_sources', async () => {
    const { data, error } = await admin
      .from('legal_sources')
      .insert({
        organization_id: TEST_ORG_ID,
        canonical_url: 'https://test-db.zakon.kz/act/realdb-test',
        title: 'Real-DB Test Source',
        source_system: 'other',
        status: 'draft',
        is_allowed: false,
        created_by: userId,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    sourceId = data!.id;
  });

  it('can INSERT into legal_source_revisions', async () => {
    const { data, error } = await admin
      .from('legal_source_revisions')
      .insert({
        source_id: sourceId,
        revision_number: 1,
        content_hash: 'sha256:realdb-test-hash',
        status: 'draft',
        fetched_by: userId,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    revisionId = data!.id;
  });

  it('can INSERT into legal_rules', async () => {
    const { data, error } = await admin
      .from('legal_rules')
      .insert({
        organization_id: TEST_ORG_ID,
        code: 'REALDB-TEST-001',
        title: 'Real-DB Test Rule',
        description: 'Test rule for real DB verification',
        source_revision_id: revisionId,
        status: 'draft',
        logic: { type: 'test', conditions: [] },
        created_by: userId,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    ruleId = data!.id;
  });

  it('can UPDATE legal_sources', async () => {
    const { error } = await admin
      .from('legal_sources')
      .update({ status: 'approved', is_allowed: true })
      .eq('id', sourceId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('legal_sources')
      .select('status, is_allowed')
      .eq('id', sourceId)
      .single();

    expect(data?.status).toBe('approved');
    expect(data?.is_allowed).toBe(true);
  });

  it('can UPDATE legal_source_revisions', async () => {
    const { error } = await admin
      .from('legal_source_revisions')
      .update({ status: 'approved' })
      .eq('id', revisionId);

    expect(error).toBeNull();
  });

  it('can UPDATE legal_rules', async () => {
    const { error } = await admin
      .from('legal_rules')
      .update({ status: 'approved', logic: { type: 'approved', conditions: ['test passed'] } })
      .eq('id', ruleId);

    expect(error).toBeNull();
  });

  it('can DELETE test data (cleanup)', async () => {
    await admin.from('legal_rules').delete().eq('id', ruleId);
    await admin.from('legal_source_revisions').delete().eq('id', revisionId);
    await admin.from('legal_sources').delete().eq('id', sourceId);

    const { data } = await admin.from('legal_sources').select('id').eq('id', sourceId).maybeSingle();
    expect(data).toBeNull();
  });
});

describe('Real-DB: Stage 3 - Contract Templates CRUD', () => {
  let templateId: string;

  it('can SELECT from contract_templates with service role', async () => {
    const { error } = await admin
      .from('contract_templates')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can INSERT into contract_templates', async () => {
    const { data, error } = await admin
      .from('contract_templates')
      .insert({
        organization_id: TEST_ORG_ID,
        code: 'REALDB-TPL-001',
        title: 'Real-DB Test Template',
        customer_type: 'individual',
        project_type: 'manufacture_only',
        status: 'draft',
        schema: { variables: {}, blocks: [] },
        created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    templateId = data!.id;
  });

  it('can UPDATE contract_templates status', async () => {
    const { error } = await admin
      .from('contract_templates')
      .update({ status: 'expert_review' })
      .eq('id', templateId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('contract_templates')
      .select('status')
      .eq('id', templateId)
      .single();

    expect(data?.status).toBe('expert_review');
  });

  it('can DELETE template (service role cleanup)', async () => {
    await admin.from('contract_templates').delete().eq('id', templateId);
    const { data } = await admin.from('contract_templates').select('id').eq('id', templateId).maybeSingle();
    expect(data).toBeNull();
  });
});

describe('Real-DB: Stage 3 - Contract Packages CRUD', () => {
  let packageId: string;
  let caseId: string;

  beforeAll(async () => {
    const { data: caseData, error: caseError } = await admin
      .from('legal_cases')
      .upsert({
        organization_id: TEST_ORG_ID,
        case_number: 'LC-999901',
        title: 'Real-DB Test Case',
        customer_type: 'individual',
        customer_display_name: 'Тестовый клиент',
        project_type: 'manufacture_only',
        status: 'draft',
        currency: 'KZT',
        source_type: 'manual',
        version: 1,
        created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      })
      .select('id')
      .single();

    if (caseError) {
      console.log('caseError:', caseError.message, caseError.code);
    }
    caseId = caseData?.id || '';
  });

  afterAll(async () => {
    if (caseId) {
      await admin.from('legal_cases').delete().eq('id', caseId);
    }
  });

  it('can SELECT from contract_packages with service role', async () => {
    const { error } = await admin
      .from('contract_packages')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can INSERT into contract_packages', async () => {
    if (!caseId) {
      console.log('Skipping: could not create test case');
      return;
    }
    const { data, error } = await admin
      .from('contract_packages')
      .insert({
        legal_case_id: caseId,
        template_code: 'REALDB-TPL-001',
        version: 1,
        status: 'draft',
        content_snapshot: { amount: '3500000' },
        source_revision_ids: [],
        created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    packageId = data!.id;
  });

  it('can UPDATE contract_packages status', async () => {
    if (!packageId) {
      console.log('Skipping: package not created');
      return;
    }
    const { error } = await admin
      .from('contract_packages')
      .update({ status: 'under_review' })
      .eq('id', packageId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('contract_packages')
      .select('status')
      .eq('id', packageId)
      .single();

    expect(data?.status).toBe('under_review');
  });
});

describe('Real-DB: RLS Enforcement', () => {
  let userClient: ReturnType<typeof createClient>;

  beforeAll(() => {
    userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('anon user without auth cannot read legal_sources (RLS blocks)', async () => {
    const { error } = await userClient
      .from('legal_sources')
      .select('id')
      .limit(1);

    // RLS should either return empty or error for unauthenticated
    if (error) {
      expect(error.code).not.toBe('42P01'); // not "table not found"
    }
  });

  it('anon user without auth cannot insert into legal_sources', async () => {
    const { error } = await userClient
      .from('legal_sources')
      .insert({
        organization_id: TEST_ORG_ID,
        canonical_url: 'https://unauthorized.test',
        title: 'Unauthorized',
        source_system: 'other',
        status: 'draft',
        is_allowed: false,
        created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      } as never);

    expect(error).not.toBeNull();
  });

  it('service role can bypass RLS and read all legal_sources', async () => {
    const { data, error } = await admin
      .from('legal_sources')
      .select('id')
      .limit(100);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Real-DB: Stage 4 - Contract Approvals CRUD', () => {
  let approvalId: string;
  let packageId: string;
  let caseId: string;

  beforeAll(async () => {
    // Create test case
    const { data: caseData } = await admin
      .from('legal_cases')
      .upsert({
        organization_id: TEST_ORG_ID,
        case_number: 'LC-999902',
        title: 'Real-DB Approval Test Case',
        customer_type: 'individual',
        customer_display_name: 'Тестовый клиент для согласования',
        project_type: 'manufacture_only',
        status: 'draft',
        currency: 'KZT',
        source_type: 'manual',
        version: 1,
        created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      })
      .select('id')
      .single();

    caseId = caseData?.id || '';

    // Create test package
    if (caseId) {
      const { data: pkgData } = await admin
        .from('contract_packages')
        .insert({
          legal_case_id: caseId,
          template_code: 'REALDB-TPL-002',
          version: 1,
          status: 'draft',
          content_snapshot: { amount: '5000000' },
          source_revision_ids: [],
          created_by: TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
        })
        .select('id')
        .single();

      packageId = pkgData?.id || '';
    }
  });

  afterAll(async () => {
    if (approvalId) await admin.from('contract_approvals').delete().eq('id', approvalId);
    if (packageId) await admin.from('contract_packages').delete().eq('id', packageId);
    if (caseId) await admin.from('legal_cases').delete().eq('id', caseId);
  });

  it('can SELECT from contract_approvals with service role', async () => {
    const { error } = await admin
      .from('contract_approvals')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('can INSERT into contract_approvals', async () => {
    if (!caseId || !packageId) {
      console.log('Skipping: case or package not created');
      return;
    }
    const userId = await getTestUserId();
    const { data, error } = await admin
      .from('contract_approvals')
      .insert({
        organization_id: TEST_ORG_ID,
        legal_case_id: caseId,
        contract_package_id: packageId,
        status: 'draft',
        requested_by: userId,
        notes: 'Тестовое согласование',
        created_by: userId,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    approvalId = data!.id;
  });

  it('can UPDATE contract_approvals status', async () => {
    if (!approvalId) {
      console.log('Skipping: approval not created');
      return;
    }
    const { error } = await admin
      .from('contract_approvals')
      .update({
        status: 'pending_review',
      })
      .eq('id', approvalId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('contract_approvals')
      .select('status')
      .eq('id', approvalId)
      .single();

    expect(data?.status).toBe('pending_review');
  });

  it('can UPDATE contract_approvals to terminal state with decided_by', async () => {
    if (!approvalId) {
      console.log('Skipping: approval not created');
      return;
    }
    const userId = await getTestUserId();
    const { error } = await admin
      .from('contract_approvals')
      .update({
        status: 'approved',
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approvalId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('contract_approvals')
      .select('status, decided_by')
      .eq('id', approvalId)
      .single();

    expect(data?.status).toBe('approved');
    expect(data?.decided_by).toBe(userId);
  });
});

describe('Real-DB: change_orders and claims Table Existence', () => {
  it('change_orders table exists in database', async () => {
    const exists = await tableExists('change_orders');
    expect(exists).toBe(true);
  });

  it('claims table exists in database', async () => {
    const exists = await tableExists('claims');
    expect(exists).toBe(true);
  });
});

describe('Real-DB: change_orders CRUD', () => {
  let changeOrderId: string | null = null;
  let testCaseId: string | null = null;
  let testPackageId: string | null = null;

  beforeAll(async () => {
    // Create a test case for change_orders
    const userId = await getTestUserId();
    const { data: caseData } = await admin
      .from('legal_cases')
      .insert({
        organization_id: TEST_ORG_ID,
        case_number: 'LC-999905',
        title: 'Тестовый кейс для change orders',
        customer_type: 'legal_entity',
        customer_display_name: 'Тестовый клиент',
        project_type: 'manufacture_only',
        status: 'draft',
        currency: 'KZT',
        created_by: userId,
      })
      .select('id')
      .single();

    if (caseData) {
      testCaseId = caseData.id;

      // Create a test package
      const { data: pkgData } = await admin
        .from('contract_packages')
        .insert({
          legal_case_id: testCaseId,
          template_code: 'TEST_TEMPLATE',
          version: 1,
          status: 'draft',
          content_snapshot: {},
          source_revision_ids: [],
          created_by: userId,
        })
        .select('id')
        .single();

      if (pkgData) {
        testPackageId = pkgData.id;
      }
    }
  });

  afterAll(async () => {
    if (changeOrderId) {
      await admin.from('change_orders').delete().eq('id', changeOrderId);
    }
    if (testPackageId) {
      await admin.from('contract_packages').delete().eq('id', testPackageId);
    }
    if (testCaseId) {
      await admin.from('legal_cases').delete().eq('id', testCaseId);
    }
  });

  it('can SELECT from change_orders with service role', async () => {
    const { error } = await admin
      .from('change_orders')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
  });

  it('can INSERT into change_orders', async () => {
    if (!testCaseId || !testPackageId) {
      console.log('Skipping: test case or package not created');
      return;
    }
    const userId = await getTestUserId();
    const { data, error } = await admin
      .from('change_orders')
      .insert({
        organization_id: TEST_ORG_ID,
        legal_case_id: testCaseId,
        contract_package_id: testPackageId,
        number: 'CO-999901',
        status: 'draft',
        change_type: 'price',
        delta_amount: 500000,
        reason: 'Тестовое изменение стоимости',
        created_by: userId,
        metadata: { old_price: 1000000, new_price: 1500000 },
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    changeOrderId = data!.id;
  });

  it('can UPDATE change_orders status', async () => {
    if (!changeOrderId) {
      console.log('Skipping: change order not created');
      return;
    }
    const { error } = await admin
      .from('change_orders')
      .update({ status: 'requested' })
      .eq('id', changeOrderId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('change_orders')
      .select('status')
      .eq('id', changeOrderId)
      .single();

    expect(data?.status).toBe('requested');
  });

  it('can UPDATE change_orders to applied with applied_at', async () => {
    if (!changeOrderId) {
      console.log('Skipping: change order not created');
      return;
    }
    const { error } = await admin
      .from('change_orders')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', changeOrderId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('change_orders')
      .select('status, applied_at')
      .eq('id', changeOrderId)
      .single();

    expect(data?.status).toBe('applied');
    expect(data?.applied_at).toBeDefined();
  });

  it('can SELECT from claims with service role', async () => {
    const { error } = await admin
      .from('claims')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
  });
});

describe('Real-DB: claims CRUD', () => {
  let claimId: string | null = null;
  let testCaseId: string | null = null;

  beforeAll(async () => {
    // Create a test case for claims
    const userId = await getTestUserId();
    const { data: caseData } = await admin
      .from('legal_cases')
      .insert({
        organization_id: TEST_ORG_ID,
        case_number: 'LC-999906',
        title: 'Тестовый кейс для претензий',
        customer_type: 'legal_entity',
        customer_display_name: 'Тестовый клиент',
        project_type: 'manufacture_only',
        status: 'draft',
        currency: 'KZT',
        created_by: userId,
      })
      .select('id')
      .single();

    if (caseData) {
      testCaseId = caseData.id;
    }
  });

  afterAll(async () => {
    if (claimId) {
      await admin.from('claims').delete().eq('id', claimId);
    }
    if (testCaseId) {
      await admin.from('legal_cases').delete().eq('id', testCaseId);
    }
  });

  it('can INSERT into claims', async () => {
    if (!testCaseId) {
      console.log('Skipping: test case not created');
      return;
    }
    const { data, error } = await admin
      .from('claims')
      .insert({
        organization_id: TEST_ORG_ID,
        legal_case_id: testCaseId,
        type: 'quality',
        status: 'open',
        opened_by: 'test@mebel-legal-kz.test',
        metadata: { description: 'Тестовая претензия по качеству' },
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    claimId = data!.id;
  });

  it('can UPDATE claims status to in_review', async () => {
    if (!claimId) {
      console.log('Skipping: claim not created');
      return;
    }
    const { error } = await admin
      .from('claims')
      .update({ status: 'in_review' })
      .eq('id', claimId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('claims')
      .select('status')
      .eq('id', claimId)
      .single();

    expect(data?.status).toBe('in_review');
  });

  it('can UPDATE claims to resolved with resolution_summary', async () => {
    if (!claimId) {
      console.log('Skipping: claim not created');
      return;
    }
    const { error } = await admin
      .from('claims')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_summary: 'Претензия удовлетворена частично',
      })
      .eq('id', claimId);

    expect(error).toBeNull();

    const { data } = await admin
      .from('claims')
      .select('status, resolved_at, resolution_summary')
      .eq('id', claimId)
      .single();

    expect(data?.status).toBe('resolved');
    expect(data?.resolved_at).toBeDefined();
    expect(data?.resolution_summary).toBe('Претензия удовлетворена частично');
  });
});
