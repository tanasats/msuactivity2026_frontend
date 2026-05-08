'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type { User } from '@/lib/types';

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // อ่าน access_token จาก URL fragment (#access_token=...)
    const fragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(fragment);
    const token = params.get('access_token');

    if (!token) {
      setError('ไม่ได้รับ access token จาก backend');
      return;
    }

    useAuthStore.getState().setAccessToken(token);

    api
      .get<User>('/api/auth/me')
      .then((res) => {
        useAuthStore.getState().setUser(res.data);
        // ล้าง fragment ออกจาก URL bar (ไม่ทิ้งให้ proxy/log เห็น)
        window.history.replaceState(null, '', '/auth/callback');
        router.replace('/dashboard');
      })
      .catch((e) => {
        console.error(e);
        setError('ไม่สามารถดึงข้อมูลผู้ใช้');
      });
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
        {error ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-red-700">เข้าสู่ระบบไม่สำเร็จ</h1>
            <p className="mb-4 text-sm text-gray-600">{error}</p>
            <a href="/login" className="text-blue-600 underline">
              ลองอีกครั้ง
            </a>
          </>
        ) : (
          <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
        )}
      </div>
    </main>
  );
}
