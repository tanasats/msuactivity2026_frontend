'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  RegistrationAuditAction,
  RegistrationAuditEntry,
} from '@/lib/types';

// Action label + tone — มาตรฐานกับ activity audit (ใช้สีในกลุ่มเดียวกัน)
const ACTION_LABEL: Record<
  RegistrationAuditAction,
  { text: string; tone: string }
> = {
  register: { text: 'นิสิตสมัครเอง', tone: 'bg-blue-50 text-blue-700' },
  staff_add: {
    text: 'เจ้าหน้าที่เพิ่มรายชื่อ',
    tone: 'bg-indigo-50 text-indigo-700',
  },
  approve: { text: 'อนุมัติ', tone: 'bg-emerald-50 text-emerald-700' },
  reject: { text: 'ปฏิเสธ', tone: 'bg-rose-50 text-rose-700' },
  cancel_by_user: {
    text: 'นิสิตยกเลิก',
    tone: 'bg-gray-100 text-gray-700',
  },
  cancel_by_staff: {
    text: 'เจ้าหน้าที่ยกเลิก',
    tone: 'bg-amber-50 text-amber-700',
  },
  check_in: { text: 'เช็คอิน (QR)', tone: 'bg-blue-50 text-blue-700' },
  staff_check_in: {
    text: 'เจ้าหน้าที่เช็คอินแทน',
    tone: 'bg-blue-50 text-blue-700',
  },
  cancel_check_in: {
    text: 'ยกเลิกเช็คอิน',
    tone: 'bg-rose-50 text-rose-700',
  },
  no_show: { text: 'ไม่เข้าร่วม', tone: 'bg-gray-200 text-gray-800' },
  evaluate: { text: 'ประเมินผล', tone: 'bg-violet-50 text-violet-700' },
  revert_evaluation: {
    text: 'ยกเลิกผลประเมิน',
    tone: 'bg-amber-50 text-amber-700',
  },
  change_role: {
    text: 'เปลี่ยนสถานภาพ',
    tone: 'bg-amber-50 text-amber-700',
  },
};

interface Props {
  open: boolean;
  registrationId: number | null;
  // ข้อมูล summary ไว้แสดงใน header (optional — บอกว่า audit ของนิสิต/กิจกรรมไหน)
  context?: {
    student_name?: string;
    msu_id?: string | null;
    activity_title?: string;
  };
  onClose: () => void;
}

export function RegistrationAuditDialog({
  open,
  registrationId,
  context,
  onClose,
}: Props) {
  const [items, setItems] = useState<RegistrationAuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !registrationId) {
      setItems(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ items: RegistrationAuditEntry[] }>(
        `/api/admin/registrations/${registrationId}/audit`,
      )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดประวัติไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, registrationId]);

  if (!open || !registrationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <History className="h-5 w-5 text-indigo-600" aria-hidden />
              ประวัติของ registration #{registrationId}
            </h2>
            {context && (
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {context.student_name && (
                  <span className="font-medium">{context.student_name}</span>
                )}
                {context.msu_id && (
                  <span className="ml-1 font-mono">({context.msu_id})</span>
                )}
                {context.activity_title && (
                  <>
                    {' '}
                    · <span>{context.activity_title}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              กำลังโหลด...
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {items && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              ยังไม่มีประวัติของ registration นี้
            </div>
          )}

          {items && items.length > 0 && (
            <ol className="relative space-y-3 border-l-2 border-gray-100 pl-5">
              {items.map((e) => {
                const meta = ACTION_LABEL[e.action] ?? {
                  text: e.action,
                  tone: 'bg-gray-100 text-gray-700',
                };
                return (
                  <li key={e.id} className="relative">
                    {/* timeline dot */}
                    <span
                      aria-hidden
                      className="absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm"
                    />
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.tone}`}
                        >
                          {meta.text}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(e.created_at).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-700">
                        โดย{' '}
                        <span className="font-medium">{e.actor_name}</span>{' '}
                        <span className="text-gray-400">
                          ({e.actor_role})
                        </span>
                      </p>
                      {e.note && (
                        <p className="mt-1 text-xs italic text-gray-600">
                          “{e.note}”
                        </p>
                      )}
                      <DiffSnippet before={e.before} after={e.after} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

// แสดง diff แบบย่อ — เฉพาะ field ที่อยู่ใน before/after (ไม่ใช่ full JSON)
function DiffSnippet({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = useMemo(() => {
    const s = new Set<string>();
    if (before) Object.keys(before).forEach((k) => s.add(k));
    if (after) Object.keys(after).forEach((k) => s.add(k));
    return [...s];
  }, [before, after]);

  if (keys.length === 0) return null;

  return (
    <div className="mt-2 rounded-md bg-gray-50 p-2 font-mono text-[11px] text-gray-700">
      {keys.map((k) => {
        const b = before?.[k];
        const a = after?.[k];
        const hasBefore = b !== undefined && b !== null;
        const hasAfter = a !== undefined && a !== null;
        return (
          <div key={k} className="flex flex-wrap items-baseline gap-1">
            <span className="text-gray-500">{k}:</span>
            {hasBefore && (
              <span className="rounded bg-rose-100 px-1 text-rose-800">
                {formatValue(b)}
              </span>
            )}
            {hasBefore && hasAfter && <span className="text-gray-400">→</span>}
            {hasAfter && (
              <span className="rounded bg-emerald-100 px-1 text-emerald-800">
                {formatValue(a)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return v.length === 0 ? '""' : v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}
