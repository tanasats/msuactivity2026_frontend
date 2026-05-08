'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

interface Props {
  onMenuClick: () => void;
}

// Mobile topbar ของนิสิต: hamburger + logo กลาง — ซ่อนใน desktop
export function MobileTopbar({ onMenuClick }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center border-b border-gray-200 bg-white px-3 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="เปิดเมนู"
        className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex flex-1 justify-center">
        <Link href="/dashboard/student" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            M
          </div>
          <span className="text-sm font-semibold text-gray-900">
            MSU Activity
          </span>
        </Link>
      </div>
      <div className="w-10" aria-hidden />
    </header>
  );
}
