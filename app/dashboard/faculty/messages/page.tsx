'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquarePlus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/lib/format';
import type { MessageThreadSummary } from '@/lib/types';

export default function FacultyMessagesPage() {
  const router = useRouter();
  const [items, setItems] = useState<MessageThreadSummary[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ items: MessageThreadSummary[] }>('/api/faculty/message-threads');
      setItems(res.data.items);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ thread_id: number }>('/api/faculty/message-threads', {
        subject: subject.trim(),
        body: body.trim(),
      });
      router.push(`/dashboard/faculty/messages/${res.data.thread_id}`);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ส่งไม่สำเร็จ');
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ติดต่อผู้ดูแล</h1>
          <p className="mt-0.5 text-sm text-gray-500">ส่งคำถาม/ข้อความถึงผู้ดูแลระบบ</p>
        </div>
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden /> คำถามใหม่
          </button>
        )}
      </div>

      {composing && (
        <div className="mb-5 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="หัวข้อ"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="ข้อความ"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setComposing(false);
                setSubject('');
                setBody('');
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={sending || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
              ส่ง
            </button>
          </div>
        </div>
      )}

      {items === null ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          ยังไม่มีบทสนทนา — กด "คำถามใหม่" เพื่อเริ่ม
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/faculty/messages/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900">
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="ยังไม่อ่าน" />}
                    {t.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(t.last_message_at)}</p>
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
