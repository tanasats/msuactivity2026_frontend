'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import { roleHomePath } from '@/lib/auth-routes';

// /dashboard เป็น smart redirect: ดู role แล้วส่งไปหน้าเฉพาะตาม roleHomePath()
// (CallbackPage เด้งตรงไปหน้า role อยู่แล้ว — หน้านี้จะเจอผู้ใช้ที่กด /dashboard เอง
//  จาก bookmark / link ภายในเป็นหลัก)
export default function DashboardRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useAuthBootstrap();

  // แสดงปุ่ม fallback ถ้าค้างนานเกิน 5 วิ (Next.js dev อาจ compile หน้า role ช้า)
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace(roleHomePath(user.role));
      return;
    }
    if (!isBootstrapping) {
      router.replace('/login');
    }
  }, [isBootstrapping, user, router]);

  const target = user ? roleHomePath(user.role) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>กำลังนำท่านไปยัง dashboard...</span>
      </div>

      {stuck && (
        <div className="mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
          <p className="mb-3">
            ใช้เวลานานกว่าปกติ — กดปุ่มด้านล่างเพื่อไปต่อด้วยตนเอง
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {target && (
              <Link
                href={target}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                ไปที่ Dashboard
              </Link>
            )}
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              เข้าสู่ระบบใหม่
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
