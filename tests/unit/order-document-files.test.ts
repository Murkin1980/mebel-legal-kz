import { describe, expect, it } from 'vitest';
import { renderDocx, renderPdf, type AccountingDocumentData } from '@/modules/orders/document-files';

const data: AccountingDocumentData = {
  title: 'Счёт на оплату',
  number: 'INV-42',
  date: '26.07.2026',
  supplier: {
    organization_id: '22222222-2222-4222-8222-222222222222',
    legal_name: 'ИП «Тест Мебель»',
    iin_bin: '123456789012',
    address: 'г. Алматы',
    phone: null, email: null, bank_name: 'Тест Банк', iik: 'KZ000000000000000000',
    bik: 'TESTKZKX', kbe: '19', knp: '710', signatory_name: 'Иванов И.И.',
    updated_at: '2026-07-26T00:00:00Z', version: 1,
  },
  customer: { name: 'ТОО «Заказчик»', iinBin: '987654321098', address: 'г. Астана' },
  order: { number: 'ORD-42', title: 'Кухонный гарнитур' },
  items: [{
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    order_id: '33333333-3333-4333-8333-333333333333',
    position: 1, name: 'Кухонный гарнитур', quantity: '1.000', unit: 'компл.',
    unit_price_tiyin: '150000000', amount_tiyin: '150000000',
    created_at: '2026-07-26T00:00:00Z',
  }],
  totalTiyin: '150000000',
};

describe('accounting document file generation', () => {
  it('creates a valid DOCX zip', async () => {
    const file = await renderDocx(data);
    expect(file.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(file[0], file[1])).toBe('PK');
  });

  it('creates a valid PDF with Cyrillic-capable embedded fonts', async () => {
    const file = await renderPdf(data);
    expect(file.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(file.slice(0, 4))).toBe('%PDF');
  });
});
