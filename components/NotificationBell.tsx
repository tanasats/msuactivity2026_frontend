'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import type { AppNotification, NotificationListResponse } from '@/lib/types';

const POLL_MS = 60_000; // refetch unread ทุก 60 วิ
const FETCH_LIMIT = 15;

// relative time แบบไทยสั้น ๆ
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// กระดิ่งแจ้งเตือน — ลอยมุมขวาบน (ใช้ในทุก dashboard layout)
//   badge จำนวนยังไม่อ่าน + dropdown รายการล่าสุด + คลิกเพื่ออ่าน/ไปหน้าเกี่ยวข้อง
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<NotificationListResponse>('/api/me/notifications', {
        params: { limit: FETCH_LIMIT },
      });
      setItems(res.data.items);
      setUnread(res.data.unread_count);
    } catch {
      /* เงียบ — best-effort */
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดครั้งแรก + poll
  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, POLL_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  // ปิด dropdown เมื่อคลิกนอกกรอบ
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchData(); // refresh ตอนเปิด
  };

  async function handleItemClick(n: AppNotification) {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      api.post(`/api/me/notifications/${n.id}/read`).catch(() => {});
    }
    setOpen(false);
    if (n.link_url) router.push(n.link_url);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    try {
      await api.post('/api/me/notifications/read-all');
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={wrapRef} className="fixed right-4 top-2.5 z-50">
      <button
        type="button"
        onClick={toggle}
        aria-label="การแจ้งเตือน"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">การแจ้งเตือน</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                ยังไม่มีการแจ้งเตือน
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                        n.is_read ? '' : 'bg-blue-50/40'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.is_read ? 'bg-transparent' : 'bg-blue-500'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-gray-600">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-gray-400">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden />
              ตั้งค่าการแจ้งเตือน
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
