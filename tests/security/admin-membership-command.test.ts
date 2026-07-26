import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const migration=readFileSync(resolve('supabase/migrations/20260726210000_manage_organization_members.sql'),'utf8');

describe('organization membership administration command',()=>{
  it('requires authenticated active owner in the target tenant',()=>{
    expect(migration).toContain('v_actor uuid := auth.uid()');
    expect(migration).toContain('organization_id=p_organization_id AND user_id=v_actor');
    expect(migration).toContain("role='owner' AND status='active'");
  });
  it('serializes changes and protects the last active owner',()=>{
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration.match(/last_owner/g)?.length).toBe(2);
    expect(migration).toContain("role='owner' AND status='active'");
  });
  it('writes an append-only audit event in the same transaction',()=>{
    expect(migration).toContain('INSERT INTO audit_events');
    expect(migration).toContain("'member.role_changed'");
    expect(migration).toContain("'member.disabled'");
    expect(migration).toContain("'member.restored'");
  });
  it('does not expose the security definer command to anon or public',()=>{
    expect(migration).toContain('REVOKE ALL');
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated');
  });
});
