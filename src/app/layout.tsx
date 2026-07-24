export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MebelDocs',
  description: 'Документооборот мебельной компании: заказы, документы и сроки',
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
