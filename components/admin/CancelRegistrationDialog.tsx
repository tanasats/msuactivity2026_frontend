'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface Props {
  registrationId: number;
  studentName: string;
  activityTitle: string;
  onClose: () => void;
  onCancelled: () => void; // หลัง cancel สำเร็จ — caller refresh list
}

// admin cancel registration — รับ reason, POST → /api/admin/registrations/:id/cancel
//   - max 1000 ตัว
//   - cancel เป็น irreversible (ของ admin) — confirm tone="danger"
export function CancelRegistrationDialog({
  registrationId,
  studentName,
  activityTitle,
  onClose,
  onCancelled,
}: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function execute() {
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/registrations/${registrationId}/cancel`, {
        reason: reason.trim(),
      });
      toast.success('ยกเลิกการลงทะเบียนแล้ว');
      onCancelled();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ยกเลิกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden />
            ยกเลิกการลงทะเบียน?
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            ยกเลิก <strong>{studentName}</strong> ออกจากกิจกรรม{' '}
            <strong>{activityTitle}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิด"
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <label
            htmlFor="cancel-reason"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            เหตุผล <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            maxLength={1000}
            placeholder="เช่น นิสิตขอลบเพราะติดเรียน, ลงทะเบียนผิด, …"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {reason.length}/1000
          </p>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            ⚠️ การยกเลิกจะคืน slot กลับให้กิจกรรม + บันทึกใน audit log ของกิจกรรม
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ไม่ยกเลิก
          </button>
          <button
            type="button"
            onClick={execute}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'กำลังยกเลิก...' : 'ยกเลิกการลงทะเบียน'}
          </button>
        </div>
      </div>
    </div>
  );
}
