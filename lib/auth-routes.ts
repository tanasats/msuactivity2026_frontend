import type { UserRole } from './types';

// หน้า dashboard เริ่มต้นของแต่ละ role — ใช้ทั้งใน /auth/callback และ /dashboard (smart-redirect)
//   staff = บัญชีตั้งต้นของบุคลากรที่ admin ยังไม่ได้ provision → ส่งไป /dashboard/legacy ให้แสดงข้อความรอ
//   executive ยังไม่มีหน้าเฉพาะ → /dashboard/legacy เช่นกัน
const ROLE_ROUTES: Record<UserRole, string> = {
  faculty_staff: '/dashboard/faculty',
  student: '/dashboard/student',
  staff: '/dashboard/legacy',
  executive: '/dashboard/legacy',
  admin: '/dashboard/admin',
  super_admin: '/dashboard/super-admin',
};

export function roleHomePath(role: UserRole | null | undefined): string {
  if (!role) return '/dashboard/legacy';
  return ROLE_ROUTES[role] ?? '/dashboard/legacy';
}
