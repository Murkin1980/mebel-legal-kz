import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260724205035_unified_order_documents_prototype.sql'
);
const sql = readFileSync(migrationPath, 'utf8');
const tables = ['orders', 'order_documents', 'order_deadlines', 'order_reminders'];

describe('order prototype migration security', () => {
  it.each(tables)('enables RLS and denies DELETE on %s', (table) => {
    expect(sql).toMatch(new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, 'i'));
    expect(sql).toMatch(new RegExp(`POLICY "${table}_delete"[\\s\\S]*USING \\(FALSE\\)`, 'i'));
  });

  it('checks active organization membership in policies', () => {
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain('user_id = (SELECT auth.uid())');
  });

  it('uses explicit grants for Data API access and no anon grant', () => {
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON orders TO authenticated');
    expect(sql).toContain('REVOKE ALL ON orders, order_documents, order_deadlines, order_reminders FROM anon, authenticated');
    expect(sql).not.toMatch(/GRANT\s+.+\s+TO\s+anon/i);
  });

  it('keeps documents immutable by forbidding deletion and only updating drafts', () => {
    expect(sql).toMatch(/CREATE POLICY "order_documents_update"[\s\S]*status = 'draft'/i);
    expect(sql).toMatch(/CREATE POLICY "order_documents_delete"[\s\S]*USING \(FALSE\)/i);
  });

  it('writes entities and audit events through restricted atomic functions', () => {
    for (const command of [
      'create_order_with_audit',
      'create_order_document_with_audit',
      'create_order_deadline_with_audit',
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `CREATE OR REPLACE FUNCTION ${command}[\\s\\S]*SECURITY DEFINER[\\s\\S]*SET search_path = public`,
          'i'
        )
      );
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION ${command}`, 'i'));
      expect(sql).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION ${command}[\\s\\S]*TO authenticated`, 'i')
      );
    }
    expect(sql).toMatch(
      /create_order_with_audit[\s\S]*INSERT INTO orders[\s\S]*INSERT INTO audit_events/i
    );
    expect(sql).toMatch(
      /create_order_deadline_with_audit[\s\S]*INSERT INTO order_deadlines[\s\S]*INSERT INTO order_reminders[\s\S]*INSERT INTO audit_events/i
    );
    expect(sql).toContain('p_actor_user_id IS DISTINCT FROM auth.uid()');
  });
});
