'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  ShieldCheck,
  Tag,
  UserCheck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  matchPrefix?: string;
}

// nav แบ่ง 2 กลุ่ม:
//   - Dashboard ของ super_admin เอง (master data + system)
//   - ลิงก์ไป admin section (super_admin มีสิทธิ์ทุกอย่างที่ admin ทำได้)
const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/super-admin', label: 'ภาพรวมระบบ', Icon: LayoutDashboard },
  {
    href: '/dashboard/super-admin/faculties',
    label: 'คณะ/หน่วยงาน',
    Icon: GraduationCap,
    matchPrefix: '/dashboard/super-admin/faculties',
  },
  {
    href: '/dashboard/super-admin/organizations',
    label: 'องค์กรจัดกิจกรรม',
    Icon: Building2,
    matchPrefix: '/dashboard/super-admin/organizations',
  },
  {
    href: '/dashboard/super-admin/categories',
    label: 'ประเภทกิจกรรม',
    Icon: Tag,
    matchPrefix: '/dashboard/super-admin/categories',
  },
  {
    href: '/dashboard/super-admin/skills',
    label: 'ทักษะ',
    Icon: Wrench,
    matchPrefix: '/dashboard/super-admin/skills',
  },
  {
    href: '/dashboard/super-admin/users',
    label: 'ผู้ใช้งาน',
    Icon: Users,
    matchPrefix: '/dashboard/super-admin/users',
  },
  {
    href: '/dashboard/super-admin/settings',
    label: 'ตั้งค่าระบบ',
    Icon: Settings,
    matchPrefix: '/dashboard/super-admin/settings',
  },
];

const ADMIN_LINKS: NavItem[] = [
  {
    href: '/dashboard/admin/activities',
    label: 'จัดการกิจกรรม',
    Icon: ClipboardList,
    matchPrefix: '/dashboard/admin/activities',
  },
  {
    href: '/dashboard/admin/students',
    label: 'นิสิต / การเข้าร่วม',
    Icon: UserCheck,
    matchPrefix: '/dashboard/admin/students',
  },
  {
    href: '/dashboard/admin/registrations',
    label: 'ค้นข้ามกิจกรรม',
    Icon: ListChecks,
    matchPrefix: '/dashboard/admin/registrations',
  },
  {
    href: '/dashboard/admin/announcements',
    label: 'ประกาศเว็บไซต์',
    Icon: Megaphone,
    matchPrefix: '/dashboard/admin/announcements',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    useAuthStore.getState().clearAuth();
    router.push('/');
  }

  function isActive(item: NavItem) {
    if (item.matchPrefix) return pathname?.startsWith(item.matchPrefix);
    return pathname === item.href;
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              MSU Activity
            </p>
            <p className="truncate text-xs text-violet-600">
              ผู้ดูแลระบบสูงสุด
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="md:hidden rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            จัดการระบบ
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <p className="mb-1 mt-4 px-3 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            งาน admin
          </p>
          {ADMIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <item.Icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="border-t border-gray-200 p-3">
            <div className="mb-2 flex items-center gap-2 px-2">
              {user.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture_url}
                  alt={user.full_name}
                  className="h-8 w-8 rounded-full border border-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.full_name}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
