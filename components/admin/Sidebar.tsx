'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Megaphone,
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

const NAV_ITEMS: NavItem[] = [
    // ลิงก์ออกไป public landing — sidebar จะหายไปเพราะอยู่นอก dashboard scope
  { 
    href: '/', 
    label: 'หน้าหลัก', 
    Icon: Home 
  },
  { href: '/dashboard/admin', label: 'Dashboard', Icon: LayoutDashboard },
  {
    href: '/dashboard/admin/activities',
    label: 'กิจกรรมทุกคณะ',
    Icon: ClipboardList,
    matchPrefix: '/dashboard/admin/activities',
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

// Sidebar admin — แยกจาก faculty Sidebar เพราะ nav items + label ผู้ใช้ต่างกัน
//   desktop (≥ md): fixed left-0 top-0, w-60
//   mobile  (< md): drawer slide จากซ้าย + backdrop
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            M
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              MSU Activity
            </p>
            <p className="truncate text-xs text-indigo-600">
              {user?.role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด' : 'ผู้ดูแลระบบ'}
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
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
