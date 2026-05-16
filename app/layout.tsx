import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import './globals.css';
import { ToastViewport } from '@/components/ToastViewport';
import { AnnouncementsRoot } from '@/components/AnnouncementsRoot';

// Sarabun — Thai font จาก Google Fonts
//   subsets thai+latin → ครอบคลุมทั้งภาษาไทยและอังกฤษ
//   weights 300-700 → รองรับ tailwind class font-light ... font-bold
//   display swap → กัน FOIT (กล่อง blank ก่อน font โหลดเสร็จ)
//   variable → expose เป็น CSS variable เพื่อให้ tailwind ใช้
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun',
});

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
    <html lang="th" className={sarabun.variable}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <AnnouncementsRoot />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
