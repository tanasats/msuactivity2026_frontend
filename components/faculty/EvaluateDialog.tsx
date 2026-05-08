'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, X, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { FacultyRegistration } from '@/lib/types';

interface Props {
  open: boolean;
  activityId: number;
  registration: FacultyRegistration | null;
  onClose: () => void;
  onSaved: () => void;
}

// Dialog: ให้เจ้าหน้าที่คณะเลือก "ผ่าน" / "ไม่ผ่าน" + ใส่หมายเหตุ (optional)
//   - prefill ด้วยผลประเมินเดิม ถ้ามี (ผู้ใช้แก้ไขผลประเมินใหม่ได้)
//   - บันทึกแล้วเรียก onSaved เพื่อให้ parent reload list
export function EvaluateDialog({
  open,
  activityId,
  registration,
  onClose,
  onSaved,
}: Props) {
  const [result, setResult] = useState<'PASSED' | 'FAILED' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && registration) {
      // prefill ด้วยค่าเดิม (ถ้าเคยประเมินแล้ว)
      const prev = registration.evaluation_status;
      setResult(prev === 'PASSED' || prev === 'FAILED' ? prev : null);
      setNote(registration.evaluation_note ?? '');
      setSubmitting(false);
    }
  }, [open, registration]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  async function submit() {
    if (!registration || !result) return;
    setSubmitting(true);
    try {
      await api.post(
        `/api/faculty/activities/${activityId}/registrations/${registration.registration_id}/evaluate`,
        { result, note: note.trim() || undefined },
      );
      toast.success(
        `บันทึกผลประเมิน "${result === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน'}" — ${registration.student_name}`,
      );
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกผลประเมินไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !registration) return null;

  const isEditing = registration.evaluation_status === 'PASSED' || registration.evaluation_status === 'FAILED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-base font-semibold text-gray-900">
              {isEditing ? 'แก้ไขผลประเมิน' : 'บันทึกผลประเมิน'}
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
          <p className="mb-1 text-sm text-gray-600">นิสิต</p>
          <p className="mb-4 text-sm font-medium text-gray-900">
            {registration.student_name}
            {registration.msu_id && (
              <span className="ml-2 text-xs text-gray-500">
                ({registration.msu_id})
              </span>
            )}
          </p>

          <p className="mb-2 text-sm font-medium text-gray-700">ผลการประเมิน</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <ResultButton
              value="PASSED"
              selected={result === 'PASSED'}
              onClick={() => setResult('PASSED')}
              disabled={submitting}
            />
            <ResultButton
              value="FAILED"
              selected={result === 'FAILED'}
              onClick={() => setResult('FAILED')}
              disabled={submitting}
            />
          </div>

          <label
            htmlFor="evaluation-note"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            หมายเหตุ <span className="text-gray-400">(ไม่บังคับ)</span>
          </label>
          <textarea
            id="evaluation-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            maxLength={1000}
            placeholder="เช่น เหตุผลที่ไม่ผ่าน หรือข้อสังเกตเพิ่มเติม"
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
            disabled={!result || submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึกผล'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultButton({
  value,
  selected,
  onClick,
  disabled,
}: {
  value: 'PASSED' | 'FAILED';
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const isPass = value === 'PASSED';
  const Icon = isPass ? CheckCircle2 : XCircle;
  const label = isPass ? 'ผ่าน' : 'ไม่ผ่าน';

  // hover tone class คงที่ (Tailwind JIT ต้องเห็น string เต็ม)
  const idleClass = isPass
    ? 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
    : 'border-gray-200 bg-white text-gray-700 hover:border-rose-400 hover:bg-rose-50';
  const selectedClass = isPass
    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
    : 'border-rose-600 bg-rose-50 text-rose-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? selectedClass : idleClass
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

