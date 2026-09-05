import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '弾性腱マップ | Wayfarer Lab',
  description:
    '3つの訪問スポットを、Paper.jsの弾性ベジェ形状でゴムのようにつなぐ地図モック。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
