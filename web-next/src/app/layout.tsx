import type { Metadata } from 'next';
import { Providers } from './providers';
import '@gametime/frontend/styles/app.css';

export const metadata: Metadata = {
  title: 'Gametime',
  description: 'Family gaming, earned and managed.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
