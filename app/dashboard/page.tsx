'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import type { UserRole } from '@/lib/types';

// /dashboard เป็น smart redirect: ดู role แล้วส่งไปหน้าเฉพาะ
// - faculty_staff → /dashboard/faculty
// - role อื่น (student/staff/executive/admin/super_admin) → /dashboard/legacy (placeholder)
const ROLE_ROUTES: Record<UserRole, string> = {
  faculty_staff: '/dashboard/faculty',
  student: '/dashboard/student',
  staff: '/dashboard/legacy',
  executive: '/dashboard/legacy',
  admin: '/dashboard/legacy',
  super_admin: '/dashboard/legacy',
};

export default function DashboardRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useAuthBootstrap();

  useEffect(() => {
    // user มี → redirect ทันที (ไม่ต้องรอ isBootstrapping เพราะ callback อาจ set user ไว้แล้ว)
    if (user) {
      router.replace(ROLE_ROUTES[user.role] ?? '/dashboard/legacy');
      return;
    }
    // ยังไม่มี user + bootstrap จบแล้ว → ไม่มี session → /login
    if (!isBootstrapping) {
      router.replace('/login');
    }
  }, [isBootstrapping, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-gray-500">กำลังนำท่านไปยัง dashboard...</p>
    </main>
  );
}
