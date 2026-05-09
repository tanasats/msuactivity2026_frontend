'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import type { UserRole } from '@/lib/types';

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'นิสิต',
  staff: 'บุคลากร (รอการยกระดับสิทธิ์)',
  faculty_staff: 'เจ้าหน้าที่คณะ',
  executive: 'ผู้บริหาร',
  admin: 'ผู้ดูแลระบบ',
  super_admin: 'ผู้ดูแลระบบสูงสุด',
};

// placeholder dashboard สำหรับ role ที่ยังไม่มีหน้าเฉพาะ (student / executive / admin / super_admin)
// + แสดงข้อความ "รอ promote" สำหรับ staff
// faculty_staff จะถูก redirect ไป /dashboard/faculty ผ่าน /dashboard
export default function LegacyDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useAuthBootstrap();

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    useAuthStore.getState().clearAuth();
    router.push('/');
  }

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500">กำลังตรวจสอบสถานะ...</p>
      </main>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  const isStaff = user.role !== 'student';

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-xl">
        <a href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← กลับหน้าหลัก
        </a>

        <div className="rounded-2xl bg-white p-8 shadow-md">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture_url}
                  alt={user.full_name}
                  className="h-14 w-14 rounded-full border border-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-500">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              ออกจากระบบ
            </button>
          </div>

          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <Row label="สิทธิ์การใช้งาน" value={ROLE_LABEL[user.role] ?? user.role} />
            {user.msu_id && <Row label="รหัสนิสิต" value={user.msu_id} mono />}
            {user.staff_id && <Row label="รหัสพนักงาน" value={user.staff_id} mono />}
            {user.position_th && <Row label="ตำแหน่ง" value={user.position_th} />}
            {user.erp_faculty_name && (
              <Row label="คณะ / สำนัก" value={user.erp_faculty_name} />
            )}
            {user.erp_department_name && (
              <Row label="กอง / ฝ่าย" value={user.erp_department_name} />
            )}
            {user.erp_program_name && (
              <Row label="กลุ่มงาน / สาขา" value={user.erp_program_name} />
            )}
            {user.phone && <Row label="โทรศัพท์" value={user.phone} mono />}
          </div>

          {user.role === 'staff' && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                บัญชีของท่านอยู่ในระบบแล้ว แต่ยังไม่ได้รับสิทธิ์การใช้งาน
                โปรดติดต่อผู้ดูแลระบบเพื่อขอยกระดับสิทธิ์
              </p>
            </div>
          )}

          {isStaff && user.role !== 'staff' && !user.staff_id && (
            <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm text-orange-900">
                ระบบดึงข้อมูลบุคลากรจาก ERP ไม่สำเร็จ — ลองออกจากระบบและเข้าใหม่ หรือติดต่อผู้ดูแล
              </p>
            </div>
          )}

          {/* <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            หน้า Dashboard เฉพาะตาม role ของท่านยังกำลังพัฒนา
          </div> */}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
