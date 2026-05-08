'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
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
  { href: '/dashboard/faculty', label: 'Dashboard', Icon: LayoutDashboard },
  {
    href: '/dashboard/faculty/activities',
    label: 'กิจกรรม',
    Icon: ClipboardList,
    matchPrefix: '/dashboard/faculty/activities',
  },
];

interface Props {
  open: boolean;        // mobile drawer state — desktop ignore
  onClose: () => void;  // ปิด drawer (mobile)
}

// Sidebar:
//   desktop (≥ md): fixed left-0 top-0, ความกว้างคงที่ 240px (w-60)
//   mobile (< md):  drawer ที่ slide จากซ้าย, มี backdrop คลิกเพื่อปิด
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
      {/* Backdrop — เฉพาะ mobile, แสดงเมื่อ drawer เปิด */}
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            M
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              MSU Activity
            </p>
            <p className="truncate text-xs text-gray-500">เจ้าหน้าที่คณะ</p>
          </div>
          {/* close button — mobile only */}
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
                onClick={onClose}  // mobile: คลิกแล้วปิด drawer
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
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
                <p className="truncate text-xs text-gray-500">{user.faculty_name}</p>
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
