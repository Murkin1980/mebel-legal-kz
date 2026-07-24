import { describe, expect, it } from 'vitest';
import {
  orderDocumentExportFilename,
  renderOrderDocumentHtml,
} from '@/modules/orders/document-export';
import type { Order, OrderDocument } from '@/modules/orders/types';

const order = {
  id: '11111111-1111-4111-8111-111111111111',
  organization_id: '22222222-2222-4222-8222-222222222222',
  order_number: 'ORD-42',
  title: 'Кухня <Премиум>',
  customer_type: 'individual',
  customer_display_name: 'Иванов & Партнёры',
  project_type: 'manufacture_delivery',
  status: 'draft',
  currency: 'KZT',
  total_amount_tiyin: '150000050',
  contract_required: false,
  source_system: 'manual',
  source_order_id: null,
  source_order_version: null,
  legacy_legal_case_id: null,
  production_due_date: null,
  delivery_due_date: null,
  created_by: '33333333-3333-4333-8333-333333333333',
  created_at: '2026-07-25T00:00:00.000Z',
  updated_at: '2026-07-25T00:00:00.000Z',
  version: 1,
} satisfies Order;

const document = {
  id: '44444444-4444-4444-8444-444444444444',
  organization_id: order.organization_id,
  order_id: order.id,
  document_type: 'invoice',
  document_number: 'INV/42',
  status: 'draft',
  version: 1,
  amount_tiyin: order.total_amount_tiyin,
  currency: 'KZT',
  contract_package_id: null,
  content_snapshot: {},
  content_hash: null,
  created_by: order.created_by,
  created_at: '2026-07-25T00:00:00.000Z',
} satisfies OrderDocument;

describe('order document HTML export', () => {
  it('exports an invoice draft with escaped customer data and exact money', () => {
    const html = renderOrderDocumentHtml(order, document);
    expect(html).toContain('ЧЕРНОВИК');
    expect(html).toContain('Иванов &amp; Партнёры');
    expect(html).toContain('Кухня &lt;Премиум&gt;');
    expect(html).toContain('1 500 000,50 ₸');
    expect(html).not.toContain('Иванов & Партнёры');
  });

  it('uses a safe deterministic filename', () => {
    expect(orderDocumentExportFilename(document)).toBe('invoice-INV-42-v1.html');
  });

  it('rejects contract export from the accounting draft renderer', () => {
    expect(() =>
      renderOrderDocumentHtml(order, { ...document, document_type: 'contract' })
    ).toThrow('Only invoice and act drafts can be exported');
  });
});
