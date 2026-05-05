'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const message = useAppStore((s) => s.message);
  const setMessage = useAppStore((s) => s.setMessage);

  useEffect(() => {
    api
      .get<{ message: string }>('/api/hello')
      .then((res) => setMessage(res.data.message))
      .catch(() => setMessage('Backend ไม่ตอบสนอง — โปรดตรวจสอบ backend service'));
  }, [setMessage]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          MSU Activity 2026
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Frontend (Next.js) → Backend (Express) → DB (PostgreSQL)
        </p>
        <div className="rounded-lg bg-gray-100 p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Backend says:
          </span>
          <p className="mt-1 text-lg font-medium text-gray-800">
            {message || 'Loading...'}
          </p>
        </div>
      </div>
    </main>
  );
}
