import type { Order, OrderDocument } from './types';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTenge(tiyin: string | null): string {
  if (tiyin === null) return 'Не указано';
  const amount = BigInt(tiyin);
  const whole = (amount / 100n).toLocaleString('ru-RU');
  const fraction = (amount % 100n).toString().padStart(2, '0');
  return `${whole},${fraction} ₸`;
}

export function orderDocumentExportFilename(document: OrderDocument): string {
  const kind = document.document_type === 'invoice' ? 'invoice' : 'act';
  const safeNumber = document.document_number.replace(/[^A-Za-zА-Яа-яЁё0-9._-]+/g, '-');
  return `${kind}-${safeNumber}-v${document.version}.html`;
}

export function renderOrderDocumentHtml(
  order: Order,
  document: OrderDocument
): string {
  if (document.document_type !== 'invoice' && document.document_type !== 'act') {
    throw new Error('Only invoice and act drafts can be exported');
  }

  const isInvoice = document.document_type === 'invoice';
  const title = isInvoice ? 'Счёт на оплату' : 'Акт выполненных работ';
  const action = isInvoice
    ? 'Оплата изготовления мебели по заказу'
    : 'Изготовление мебели по заказу';
  const amount = formatTenge(document.amount_tiyin);
  const createdAt = new Date(document.created_at).toLocaleDateString('ru-RU', {
    timeZone: 'Asia/Almaty',
  });

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} ${escapeHtml(document.document_number)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:40px;line-height:1.4}
    main{max-width:900px;margin:auto}
    .draft{border:2px solid #9a6700;background:#fff8c5;padding:12px;margin-bottom:24px;font-weight:700}
    h1{font-size:24px;margin:0 0 24px}
    dl{display:grid;grid-template-columns:190px 1fr;gap:8px;margin:0 0 24px}
    dt{font-weight:700}
    dd{margin:0}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    th,td{border:1px solid #555;padding:10px;text-align:left}
    th:last-child,td:last-child{text-align:right}
    .total{text-align:right;font-size:18px;font-weight:700}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:64px}
    .line{border-bottom:1px solid #111;height:32px}
    @media print{body{margin:15mm}.draft{break-inside:avoid}}
  </style>
</head>
<body>
  <main>
    <div class="draft">ЧЕРНОВИК — перед использованием заполните и проверьте реквизиты сторон.</div>
    <h1>${escapeHtml(title)} № ${escapeHtml(document.document_number)} от ${createdAt}</h1>
    <dl>
      <dt>Заказ</dt><dd>${escapeHtml(order.order_number)} — ${escapeHtml(order.title)}</dd>
      <dt>Поставщик / исполнитель</dt><dd>Заполнить реквизиты организации</dd>
      <dt>Покупатель / заказчик</dt><dd>${escapeHtml(order.customer_display_name)}</dd>
      <dt>Договор</dt><dd>${order.contract_required ? 'Указать договор' : 'Не является обязательным для этого заказа'}</dd>
      <dt>Валюта</dt><dd>KZT</dd>
    </dl>
    <table>
      <thead><tr><th>№</th><th>Наименование</th><th>Количество</th><th>Сумма</th></tr></thead>
      <tbody><tr><td>1</td><td>${escapeHtml(action)}</td><td>1</td><td>${amount}</td></tr></tbody>
    </table>
    <p class="total">Итого: ${amount}</p>
    <div class="signatures">
      <div><strong>${isInvoice ? 'Поставщик' : 'Исполнитель'}</strong><div class="line"></div></div>
      <div><strong>${isInvoice ? 'Покупатель' : 'Заказчик'}</strong><div class="line"></div></div>
    </div>
  </main>
</body>
</html>`;
}
