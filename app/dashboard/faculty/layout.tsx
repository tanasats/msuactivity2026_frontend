'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import { Sidebar } from '@/components/faculty/Sidebar';
import { MobileTopbar } from '@/components/faculty/MobileTopbar';

// auth guard ของ faculty section: ต้อง login + role faculty_staff (admin/super_admin เข้าได้ด้วย)
//
// Layout shell:
//   desktop (≥ md): sidebar fixed ซ้าย กว้าง 60 (240px) — content เริ่มที่ pl-60
//   mobile  (< md): topbar fixed บน + drawer slide จากซ้าย — content เริ่มที่ pt-14
export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useAuthBootstrap();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ปิด drawer อัตโนมัติเมื่อเปลี่ยน route (กัน drawer ค้างเปิดหลัง navigate ใน mobile)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!['faculty_staff', 'admin', 'super_admin'].includes(user.role)) {
      router.replace('/dashboard/legacy');
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
