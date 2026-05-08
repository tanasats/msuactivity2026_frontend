'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import { Sidebar } from '@/components/admin/Sidebar';
import { MobileTopbar } from '@/components/admin/MobileTopbar';

// auth guard: ต้อง login + role admin หรือ super_admin
//   role อื่น (faculty_staff, student, ฯลฯ) → redirect กลับ /dashboard ให้ smart-router แยก
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useAuthBootstrap();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ปิด drawer อัตโนมัติเมื่อเปลี่ยน route
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!['admin', 'super_admin'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500">กำลังตรวจสอบสถานะ...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileTopbar onMenuClick={() => setDrawerOpen(true)} />
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="pt-14 md:pl-60 md:pt-0">{children}</div>
    </div>
  );
}
