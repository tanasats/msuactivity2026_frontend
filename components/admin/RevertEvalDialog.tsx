'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Props {
  open: boolean;
  registrationId: number | null;
  studentName: string;
  previousResult: 'PASSED' | 'FAILED' | null;
  onClose: () => void;
  onReverted: () => Promise<void> | void;
}

// Dialog ยกเลิกผลประเมินสำหรับ admin/super_admin pages
//   POST /api/admin/registrations/:id/revert-evaluation (super_admin only — gate ที่ backend)
//   reason เป็น optional — ไม่บังคับ
export function RevertEvalDialog({
  open,
  registrationId,
  studentName,
  previousResult,
  onClose,
  onReverted,
}: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function execute() {
    if (!registrationId) return;
    setBusy(true);
    try {
      const body: { reason?: string } = {};
      const trimmed = reason.trim();
      if (trimmed) body.reason = trimmed;
      await api.post(
        `/api/admin/registrations/${registrationId}/revert-evaluation`,
        body,
      );
      toast.success(
        `ยกเลิกผลประเมินของ ${studentName} แล้ว — กลับเป็น "รอประเมิน"`,
      );
      setReason('');
      await onReverted();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ยกเลิกผลประเมินไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  const prevLabel = previousResult === 'PASSED' ? '"ผ่าน"' : '"ไม่ผ่าน"';

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="ยกเลิกผลประเมิน?"
      message={
        <div className="space-y-3">
          <p>
            ยกเลิกผลประเมิน <strong>{prevLabel}</strong> ของ{' '}
            <strong>{studentName}</strong> — สถานะจะกลับเป็น{' '}
            <strong>"รอประเมิน"</strong> และข้อมูลผู้ประเมินจะถูกล้าง
          </p>
          <p className="text-xs text-amber-700">
            หลังจากนี้ ผู้ประเมินจะประเมินใหม่ หรือยกเลิกเช็คอินต่อก็ได้
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">
              เหตุผล{' '}
              <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="เช่น ประเมินผิด, ต้องการทบทวนผลใหม่"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              autoFocus
            />
          </label>
        </div>
      }
      confirmLabel="ยกเลิกผลประเมิน"
      loading={busy}
      onConfirm={execute}
      onCancel={handleClose}
    />
  );
}
