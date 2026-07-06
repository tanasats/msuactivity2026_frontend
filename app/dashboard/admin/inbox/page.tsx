'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { MessageThreadSummary } from '@/lib/types';

type Filter = 'OPEN' | 'RESOLVED' | 'ALL';

export default function AdminInboxPage() {
  const [items, setItems] = useState<MessageThreadSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [q, setQ] = useState('');

  async function load() {
    setItems(null);
    const params: Record<string, string> = {};
    if (filter !== 'ALL') params.status = filter;
    if (q.trim()) params.q = q.trim();
    try {
      const res = await api.get<{ items: MessageThreadSummary[] }>('/api/admin/message-threads', { params });
      setItems(res.data.items);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q]);

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Inbox className="h-6 w-6 text-blue-600" aria-hidden /> กล่องข้อความจากคณะ
      </h1>
      <p className="mt-0.5 text-sm text-gray-500">คำถาม/ข้อความจากเจ้าหน้าที่คณะ — ตอบและปิดเมื่อแก้ไขแล้ว</p>

      <div className="mt-5 mb-4 flex flex-wrap items-center gap-2">
        {(['OPEN', 'RESOLVED', 'ALL'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f === 'OPEN' ? 'เปิดอยู่' : f === 'RESOLVED' ? 'แก้ไขแล้ว' : 'ทั้งหมด'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา หัวข้อ / ชื่อ"
            className="w-48 rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {items === null ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          ไม่มีบทสนทนา
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/admin/inbox/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900">
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="ยังไม่อ่าน" />}
                    {t.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {t.creator_name}
                    {t.creator_faculty ? ` · ${t.creator_faculty}` : ''} · {formatDateTime(t.last_message_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.status === 'RESOLVED' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {t.status === 'RESOLVED' ? 'แก้ไขแล้ว' : 'เปิดอยู่'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
