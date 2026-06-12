'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ url: string }>('/api/auth/google/url');
      window.location.href = res.data.url;
    } catch (e) {
      console.error(e);
      setError('ไม่สามารถติดต่อ backend ได้ — ตรวจสอบว่า backend service ทำงานอยู่');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className='flex justify-center items-center w-full py-4'>
          <Image
            src="/images/20220805-HeaderMSU.webp"
            alt="มหาวิทยาลัยมหาสารคาม"
            width={400}
            height={120}
            className="h-auto w-full max-w-xs"
            priority
          />
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-3xl font-bold text-gray-600">MSU Activity</h1>
        <p className="mb-8 text-sm text-gray-500">
          ระบบกิจกรรมนิสิต มหาวิทยาลัยมหาสารคาม
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'กำลังเปิดหน้า login...' : 'เข้าสู่ระบบด้วย email MSU'}
        </button>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <p className="mt-6 text-xs text-gray-400 text-center">
          ใช้บัญชีอีเมลของมหาวิทยาลัย <span className="font-mono">@msu.ac.th</span> เท่านั้น
        </p>
        <div className='flex justify-between text-xs mt-4 text-blue-700'>
        <Link href={'https://pdpa.msu.ac.th/privacy-policy'}>Privacy Policy</Link>  
        <Link href={'https://portal.msu.ac.th'}>Help</Link>      
        </div>
      </div>
      <div className="pt-5 text-slate-500">
        <Link href={'/'}>กลับหน้าหลัก</Link>
      </div>
    </main>
  );
}
