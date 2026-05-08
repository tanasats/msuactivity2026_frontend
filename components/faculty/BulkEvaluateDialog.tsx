'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, X, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { BulkEvaluateResult } from '@/lib/types';

interface Props {
  open: boolean;
  activityId: number;
  registrationIds: number[];
  result: 'PASSED' | 'FAILED' | null;
  onClose: () => void;
  onSaved: () => void;
}

// Dialog ยืนยันการให้ผลประเมินกลุ่ม — แสดงจำนวน + รับ note (optional) แล้ว submit
//   ใช้ตอน faculty staff เลือก registrations หลายอัน + กด "ผ่านทั้งหมด" / "ไม่ผ่านทั้งหมด"
export function BulkEvaluateDialog({
  open,
  activityId,
  registrationIds,
  result,
  onClose,
  onSaved,
}: Props) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  async function submit() {
    if (!result || registrationIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post<BulkEvaluateResult>(
        `/api/faculty/activities/${activityId}/registrations/bulk-evaluate`,
        {
          registration_ids: registrationIds,
          result,
          note: note.trim() || undefined,
        },
      );
      const { updated, skipped } = res.data;
      const word = result === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน';
      if (skipped.length === 0) {
        toast.success(`บันทึกผล "${word}" ${updated.length} รายการ`);
      } else {
        toast.success(
          `บันทึก ${updated.length} รายการ — ข้าม ${skipped.length} (ยังไม่เช็คอินหรือไม่ตรงกิจกรรม)`,
        );
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกผลประเมินไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !result) return null;

  const isPass = result === 'PASSED';
  const Icon = isPass ? CheckCircle2 : XCircle;
  const word = isPass ? 'ผ่าน' : 'ไม่ผ่าน';
  const accentClass = isPass
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-rose-600 hover:bg-rose-700';
  const iconColor = isPass ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className={`h-5 w-5 ${iconColor}`} aria-hidden />
            <h2 className="text-base font-semibold text-gray-900">
              ให้ผลประเมิน "{word}" หลายคน
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">จะให้ผลประเมิน</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden />
              <span className={iconColor}>{word}</span>
              <span className="text-gray-700">
                · {registrationIds.length} รายการ
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              เฉพาะรายการที่เช็คอินแล้วเท่านั้นที่จะถูกประเมิน — รายการที่ยังไม่เช็คอินจะถูกข้าม
            </p>
          </div>

          <label
            htmlFor="bulk-note"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            หมายเหตุ <span className="text-gray-400">(ใส่ให้ทุกคน, ไม่บังคับ)</span>
          </label>
          <textarea
            id="bulk-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            maxLength={1000}
            placeholder={
              isPass
                ? 'เช่น เข้าร่วมครบทุกช่วง'
                : 'เช่น มาสาย / ไม่ครบเวลา'
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {note.length}/1000
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${accentClass}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {submitting ? 'กำลังบันทึก...' : `บันทึก ${word} ทั้งหมด`}
          </button>
        </div>
      </div>
    </div>
  );
}
