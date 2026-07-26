export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MebelDocs — документооборот мебельной компании',
    template: '%s · MebelDocs',
  },
  description:
    'Заказы, счета, акты, договоры, сроки и напоминания для мебельных компаний Казахстана.',
  metadataBase: new URL('https://mebel-legal-kz.muriktl.workers.dev'),
  openGraph: {
    title: 'MebelDocs — весь заказ в одном рабочем окне',
    description:
      'Документооборот для мебельных компаний Казахстана: от заказа до счёта и акта.',
    type: 'website',
    locale: 'ru_KZ',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
