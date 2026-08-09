import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve('supabase/migrations/033_client_approval_links.sql'), 'utf8');

describe('Stage 6 public approval security contract', () => {
  it('enables RLS and denies direct anonymous decision inserts', () => {
    expect(sql).toContain('ALTER TABLE approval_public_links ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('approval_decisions_no_client_write');
    expect(sql).toContain('WITH CHECK (false)');
  });

  it('keeps privileged RPCs service-only without definer escalation', () => {
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION record_client_approval_decision[\s\S]+FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION record_client_approval_decision[\s\S]+TO service_role/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION create_client_approval_link[\s\S]+FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION revoke_client_approval_link[\s\S]+FROM PUBLIC, anon, authenticated/);
  });

  it('enforces one immutable decision per link and idempotent command ids', () => {
    expect(sql).toContain('approval_decisions_one_per_link_idx');
    expect(sql).toContain('command_id UUID NOT NULL UNIQUE');
    expect(sql).toContain('approval_decisions_no_update');
    expect(sql).toContain('approval_decisions_no_delete');
  });

  it('limits challenge attempts and consumes a valid challenge', () => {
    expect(sql).toContain('challenge_attempts >= 0 AND challenge_attempts <= 5');
    expect(sql).toContain('challenge_consumed_at = NOW()');
  });

  it('prevents direct insert/update and cascade deletion of legal history', () => {
    expect(sql).toContain('approval_public_links_no_insert');
    expect(sql).toContain('approval_public_links_no_update');
    expect(sql).toContain('approval_public_links_no_select');
    expect(sql).toContain('REVOKE ALL ON approval_public_links, approval_decisions FROM anon, authenticated');
    expect(sql).toContain('contract_approval_id UUID NOT NULL REFERENCES contract_approvals(id) ON DELETE RESTRICT');
  });
});
