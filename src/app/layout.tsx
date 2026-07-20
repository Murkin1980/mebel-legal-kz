export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MebelLegal KZ',
  description: 'Правовой контур для мебельного бизнеса Республики Казахстан',
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
