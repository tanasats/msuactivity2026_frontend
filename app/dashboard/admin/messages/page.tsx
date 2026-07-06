'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface UserLite {
  id: number;
  full_name: string;
  email: string;
  msu_id: string | null;
  role: string;
  faculty_name: string | null;
}

const MAX_RECIPIENTS = 500;
const SEARCH_DEBOUNCE_MS = 300;

export default function AdminMessagesPage() {
  const [selected, setSelected] = useState<UserLite[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);

  // ── recipient search ──
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const s = ++seq.current;
      setSearching(true);
      api
        .get<{ items: UserLite[] }>('/api/users', { params: { q: term, limit: 8 } })
        .then((res) => {
          if (s === seq.current) setResults(res.data.items);
        })
        .catch(() => s === seq.current && setResults([]))
        .finally(() => s === seq.current && setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const addRecipient = (u: UserLite) => {
    setSelected((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
    setQ('');
    setResults([]);
  };
  const removeRecipient = (id: number) =>
    setSelected((prev) => prev.filter((x) => x.id !== id));

  const canSend =
    selected.length > 0 && title.trim() && body.trim() && !sending && selected.length <= MAX_RECIPIENTS;

  async function handleSend() {
    setSending(true);
    try {
      const res = await api.post<{
        recipients: number;
        in_app: number;
        email_queued: number;
        email_skipped: string | null;
      }>('/api/admin/notifications/message', {
        user_ids: selected.map((u) => u.id),
        title: title.trim(),
        body: body.trim(),
        link_url: linkUrl.trim() || undefined,
        send_email: sendEmail,
      });
      const d = res.data;
      let msg = `ส่งถึง ${d.recipients} คน (in-app ${d.in_app}`;
      if (sendEmail) msg += d.email_skipped ? `, email: ${d.email_skipped}` : `, email ${d.email_queued}`;
      msg += ')';
      toast.success(msg);
      // reset
      setSelected([]);
      setTitle('');
      setBody('');
      setLinkUrl('');
      setSendEmail(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ส่งไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Send className="h-6 w-6 text-blue-600" aria-hidden />
          ส่งข้อความถึงผู้ใช้
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          ส่งการแจ้งเตือนถึงผู้ใช้รายบุคคล — เข้ากระดิ่งในเว็บเสมอ (ส่ง email เพิ่มได้)
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        {/* Recipients */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ผู้รับ {selected.length > 0 && <span className="text-gray-400">({selected.length})</span>}
          </label>

          {selected.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-blue-800"
                >
                  {u.full_name}
                  <button
                    type="button"
                    onClick={() => removeRecipient(u.id)}
                    className="rounded-full p-0.5 hover:bg-blue-200"
                    aria-label={`ลบ ${u.full_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาผู้ใช้ (ชื่อ / รหัส / อีเมล)"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" aria-hidden />
            )}
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {results.map((u) => {
                  const already = selected.some((x) => x.id === u.id);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => addRecipient(u)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-40"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {u.full_name}
                          {already && <span className="ml-2 text-xs text-gray-400">(เลือกแล้ว)</span>}
                        </span>
                        <span className="text-xs text-gray-500">
                          {u.msu_id ?? '—'} · {u.email} · {u.role}
                          {u.faculty_name ? ` · ${u.faculty_name}` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">หัวข้อ</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="เช่น แจ้งเตือนการอัปเดตข้อมูล"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ข้อความ</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="เนื้อหาที่ต้องการแจ้ง"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-0.5 text-right text-xs text-gray-400">{body.length}/2000</p>
        </div>

        {/* Link (optional) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ลิงก์ปลายทาง <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/dashboard/student/certificates หรือ URL เต็ม"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Send email option */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          ส่งอีเมลด้วย (นอกจากกระดิ่งในเว็บ)
        </label>

        {/* Send */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            ส่งข้อความ
          </button>
        </div>
      </div>
    </div>
  );
}
