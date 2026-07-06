'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/lib/store';
import { formatDateTime } from '@/lib/format';
import type { MessageThreadDetail } from '@/lib/types';

interface Props {
  getUrl: string; // GET thread + messages
  replyUrl: string; // POST message
  resolveUrl?: string; // POST resolve (admin only)
  backHref: string;
}

// หน้าบทสนทนา (ใช้ร่วมทั้ง faculty + admin) — bubble ขวา=ของฉัน / ซ้าย=อีกฝ่าย
export function MessageThread({ getUrl, replyUrl, resolveUrl, backHref }: Props) {
  const me = useAuthStore((s) => s.user);
  const [data, setData] = useState<MessageThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api.get<MessageThreadDetail>(getUrl);
      setData(res.data);
    } catch {
      setError('โหลดบทสนทนาไม่สำเร็จ');
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  async function handleSend() {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.post(replyUrl, { body });
      setReply('');
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ส่งไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }

  async function handleResolve() {
    if (!resolveUrl) return;
    setResolving(true);
    try {
      await api.post(resolveUrl);
      toast.success('ทำเครื่องหมายแก้ไขแล้ว');
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ทำไม่สำเร็จ');
    } finally {
      setResolving(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-rose-600">{error}</p>
        <Link href={backHref} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          ← กลับ
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
      </div>
    );
  }

  const { thread, messages } = data;
  const isResolved = thread.status === 'RESOLVED';

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col p-4 md:h-screen md:p-6">
      {/* header */}
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="min-w-0">
          <Link href={backHref} className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> กลับ
          </Link>
          <h1 className="truncate text-lg font-bold text-gray-900">{thread.subject}</h1>
          <p className="text-xs text-gray-500">
            {thread.creator_name}
            {thread.creator_faculty ? ` · ${thread.creator_faculty}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isResolved ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isResolved ? 'แก้ไขแล้ว' : 'เปิดอยู่'}
          </span>
          {resolveUrl && !isResolved && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> แก้ไขแล้ว
            </button>
          )}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 ring-1 ring-gray-200'
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-gray-400">
                  {mine ? 'คุณ' : m.sender_name} · {formatDateTime(m.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* reply box */}
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={isResolved ? 'ตอบกลับ (จะเปิดบทสนทนาอีกครั้ง)' : 'พิมพ์ข้อความ...'}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
}
