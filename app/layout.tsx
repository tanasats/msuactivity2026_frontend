import type { Metadata } from 'next';
import './globals.css';
import { ToastViewport } from '@/components/ToastViewport';

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
        <ToastViewport />
      </body>
    </html>
  );
}
