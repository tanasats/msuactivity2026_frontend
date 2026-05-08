'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, UserPlus, X, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { BulkAddErrorReason, BulkAddResult } from '@/lib/types';

interface Props {
  open: boolean;
  activityId: number;
  onClose: () => void;
  onAdded: () => void; // หลังเพิ่มสำเร็จ — parent reload
}

const REASON_LABEL: Record<BulkAddErrorReason, string> = {
  NOT_FOUND: 'ไม่พบรหัสนิสิตในระบบ',
  NOT_STUDENT: 'ไม่ใช่บัญชีนิสิต',
  ALREADY_REGISTERED: 'สมัครไว้แล้ว',
  FULL: 'ที่นั่งเต็ม',
  NOT_OPEN: 'กิจกรรมไม่อยู่ในสถานะที่รับสมัคร',
  ERROR: 'ข้อผิดพลาดอื่น',
};

// Dialog: ใส่รหัสนิสิต (1 คน/บรรทัด หรือคั่นด้วย comma/space) → bulk add
export function BulkAddDialog({ open, activityId, onClose, onAdded }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkAddResult | null>(null);

  // reset state ทุกครั้งที่เปิด
  useEffect(() => {
    if (open) {
      setText('');
      setResult(null);
      setSubmitting(false);
    }
  }, [open]);

  // ปิดด้วย Esc (skip ระหว่าง submitting)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  function parseIds(input: string): string[] {
    return [
      ...new Set(
        input
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      ),
    ];
  }

  async function handleSubmit() {
    const ids = parseIds(text);
    if (ids.length === 0) {
      toast.error('กรุณาใส่รหัสนิสิตอย่างน้อย 1 รายการ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<BulkAddResult>(
        `/api/faculty/activities/${activityId}/registrations/bulk-add`,
        { msu_ids: ids },
      );
      setResult(res.data);
      const okCount = res.data.added.length;
      const errCount = res.data.errors.length;
      if (okCount > 0) toast.success(`เพิ่มสำเร็จ ${okCount} คน`);
      if (errCount > 0) toast.error(`มีปัญหา ${errCount} คน — ดูรายละเอียดในกล่อง`);
      if (okCount > 0) onAdded();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'เพิ่มรายชื่อไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const previewIds = parseIds(text);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose()}
        aria-hidden
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="ปิด"
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <UserPlus className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              เพิ่มรายชื่อผู้เข้าร่วม
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              ใส่รหัสนิสิต (1 คน/บรรทัด หรือคั่นด้วยช่องว่าง / comma) — ระบบจะ
              อนุมัติเข้าร่วมทันทีและออก QR ให้
            </p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'65010999001\n65020999002\n65120999003'}
          rows={8}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={submitting}
        />

        <p className="mt-2 text-xs text-gray-500">
          {previewIds.length === 0
            ? 'ยังไม่มีรหัสนิสิต'
            : `รวม ${previewIds.length} รหัส (ลบรายการซ้ำให้แล้ว)`}
        </p>

        {/* result summary */}
        {result && (
          <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            {result.added.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 flex items-center gap-1 font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  เพิ่มสำเร็จ {result.added.length} คน
                </p>
                <ul className="space-y-0.5 text-xs text-gray-600">
                  {result.added.map((a) => (
                    <li key={a.msu_id} className="font-mono">
                      ✓ {a.msu_id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 font-medium text-rose-800">
                  <XCircle className="h-4 w-4" aria-hidden />
                  ไม่สามารถเพิ่ม {result.errors.length} คน
                </p>
                <ul className="space-y-0.5 text-xs text-gray-700">
                  {result.errors.map((e) => (
                    <li key={e.msu_id}>
                      <span className="font-mono">✗ {e.msu_id}</span> —{' '}
                      <span className="text-rose-700">
                        {REASON_LABEL[e.reason]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {result ? 'ปิด' : 'ยกเลิก'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || previewIds.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? 'กำลังเพิ่ม...'
                : `เพิ่ม ${previewIds.length} คน`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
