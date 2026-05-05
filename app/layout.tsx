import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MSU Activity 2026',
  description: 'Activity management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
