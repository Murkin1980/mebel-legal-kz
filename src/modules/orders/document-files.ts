import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Order, OrderDocument, OrderItem, OrganizationDocumentProfile } from './types';

pdfMake.addVirtualFileSystem(pdfFonts);

export type AccountingDocumentData = {
  title: string;
  number: string;
  date: string;
  supplier: OrganizationDocumentProfile | null;
  customer: { name: string; iinBin: string | null; address: string | null };
  order: { number: string; title: string };
  items: OrderItem[];
  totalTiyin: string;
};

const money = (tiyin: string) => {
  const amount = BigInt(tiyin);
  return `${(amount / 100n).toLocaleString('ru-RU')},${(amount % 100n)
    .toString().padStart(2, '0')} ₸`;
};

const cell = (text: string, bold = false) =>
  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });

export function accountingDocumentData(
  order: Order,
  document: OrderDocument,
  currentItems: OrderItem[],
  currentProfile: OrganizationDocumentProfile | null
): AccountingDocumentData {
  const snapshot = document.content_snapshot as {
    supplier?: OrganizationDocumentProfile;
    items?: OrderItem[];
    customer_iin_bin?: string | null;
    customer_address?: string | null;
  };
  return {
    title: document.document_type === 'invoice' ? 'Счёт на оплату' : 'Акт выполненных работ',
    number: document.document_number,
    date: new Date(document.created_at).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' }),
    supplier: snapshot.supplier || currentProfile,
    customer: {
      name: order.customer_display_name,
      iinBin: snapshot.customer_iin_bin ?? order.customer_iin_bin,
      address: snapshot.customer_address ?? order.customer_address,
    },
    order: { number: order.order_number, title: order.title },
    items: snapshot.items?.length ? snapshot.items : currentItems,
    totalTiyin: document.amount_tiyin || order.total_amount_tiyin,
  };
}

export async function renderDocx(data: AccountingDocumentData): Promise<Uint8Array> {
  const rows = [
    new TableRow({ children: ['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма'].map((v) => cell(v, true)) }),
    ...data.items.map((item) => new TableRow({
      children: [
        String(item.position), item.name, item.quantity, item.unit,
        money(item.unit_price_tiyin), money(item.amount_tiyin),
      ].map((v) => cell(v)),
    })),
  ];
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${data.title} № ${data.number} от ${data.date}`, bold: true, size: 30 })] }),
        new Paragraph({ text: `Заказ: ${data.order.number} — ${data.order.title}`, spacing: { before: 240 } }),
        new Paragraph({ text: `Поставщик / исполнитель: ${data.supplier?.legal_name || 'Реквизиты не заполнены'}` }),
        new Paragraph({ text: `ИИН / БИН: ${data.supplier?.iin_bin || '—'}; адрес: ${data.supplier?.address || '—'}` }),
        new Paragraph({ text: `Банк: ${data.supplier?.bank_name || '—'}; ИИК: ${data.supplier?.iik || '—'}; БИК: ${data.supplier?.bik || '—'}` }),
        new Paragraph({ text: `Покупатель / заказчик: ${data.customer.name}; ИИН / БИН: ${data.customer.iinBin || '—'}; адрес: ${data.customer.address || '—'}`, spacing: { after: 240 } }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240 }, children: [new TextRun({ text: `Итого: ${money(data.totalTiyin)}`, bold: true })] }),
        new Paragraph({ text: `Исполнитель: __________________ / ${data.supplier?.signatory_name || '__________________'}`, spacing: { before: 600 } }),
        new Paragraph({ text: 'Заказчик: __________________ / __________________' }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

export async function renderPdf(data: AccountingDocumentData): Promise<Uint8Array> {
  const body: Content[][] = [
    ['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма'].map((text) => ({ text, bold: true })),
    ...data.items.map((item) => [
      String(item.position), item.name, item.quantity, item.unit,
      money(item.unit_price_tiyin), money(item.amount_tiyin),
    ]),
  ];
  const definition: TDocumentDefinitions = {
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      { text: `${data.title} № ${data.number} от ${data.date}`, style: 'header' },
      { text: `Заказ: ${data.order.number} — ${data.order.title}`, margin: [0, 18, 0, 8] },
      `Поставщик / исполнитель: ${data.supplier?.legal_name || 'Реквизиты не заполнены'}`,
      `ИИН / БИН: ${data.supplier?.iin_bin || '—'}; адрес: ${data.supplier?.address || '—'}`,
      `Банк: ${data.supplier?.bank_name || '—'}; ИИК: ${data.supplier?.iik || '—'}; БИК: ${data.supplier?.bik || '—'}`,
      { text: `Покупатель / заказчик: ${data.customer.name}; ИИН / БИН: ${data.customer.iinBin || '—'}; адрес: ${data.customer.address || '—'}`, margin: [0, 0, 0, 14] },
      { table: { headerRows: 1, widths: [22, '*', 42, 34, 62, 62], body } },
      { text: `Итого: ${money(data.totalTiyin)}`, bold: true, alignment: 'right', margin: [0, 14, 0, 30] },
      `Исполнитель: __________________ / ${data.supplier?.signatory_name || '__________________'}`,
      { text: 'Заказчик: __________________ / __________________', margin: [0, 12, 0, 0] },
    ],
    styles: { header: { fontSize: 16, bold: true, alignment: 'center' } },
  };
  return pdfMake.createPdf(definition).getBuffer();
}
