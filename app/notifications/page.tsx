'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import { formatDateTime } from '@/lib/format';
import type { AppNotification, NotificationListResponse } from '@/lib/types';

const PAGE_SIZE = 30;

export default function NotificationsPage() {
  const router = useRouter();
  useAuthBootstrap();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) router.replace('/login');
  }, [isBootstrapping, user, router]);

  const fetchPage = useCallback(async (before: string | null) => {
    const params: Record<string, string | number> = { limit: PAGE_SIZE };
    if (before) params.before = before;
    const res = await api.get<NotificationListResponse>('/api/me/notifications', { params });
    return res.data.items;
  }, []);

  // โหลดหน้าแรก
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchPage(null)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setHasMore(rows.length >= PAGE_SIZE);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, fetchPage]);

  async function loadMore() {
    if (!items.length) return;
    setLoadingMore(true);
    try {
      const oldest = items[items.length - 1].created_at;
      const rows = await fetchPage(oldest);
      // dedupe ด้วย source+id (ประกาศ broadcast อาจซ้ำข้ามหน้า)
      const seen = new Set(items.map((x) => `${x.source}-${x.id}`));
      const fresh = rows.filter((x) => !seen.has(`${x.source}-${x.id}`));
      setItems((prev) => [...prev, ...fresh]);
      setHasMore(rows.length >= PAGE_SIZE && fresh.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleClick(n: AppNotification) {
    if (!n.is_read) {
      setItems((prev) =>
        prev.map((x) => (x.source === n.source && x.id === n.id ? { ...x, is_read: true } : x)),
      );
      const url =
        n.source === 'announcement'
          ? `/api/me/announcements/${n.id}/read`
          : `/api/me/notifications/${n.id}/read`;
      api.post(url).catch(() => {});
    }
    if (n.link_url) router.push(n.link_url);
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await api.post('/api/me/notifications/read-all').catch(() => {});
  }

  if (isBootstrapping || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" aria-hidden /> กลับ
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Bell className="h-5 w-5 text-blue-600" aria-hidden /> การแจ้งเตือนทั้งหมด
            </h1>
          </div>
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden /> อ่านทั้งหมด
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            ยังไม่มีการแจ้งเตือน
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {items.map((n) => (
                <li key={`${n.source}-${n.id}`}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                      n.is_read ? '' : 'bg-blue-50/40'
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {n.category === 'admin_message' && (
                          <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">ผู้ดูแล</span>
                        )}
                        <span className="text-sm font-medium text-gray-900">{n.title}</span>
                      </span>
                      {n.body && <span className="mt-0.5 block text-xs text-gray-600">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-gray-400">{formatDateTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  โหลดเพิ่มเติม
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
