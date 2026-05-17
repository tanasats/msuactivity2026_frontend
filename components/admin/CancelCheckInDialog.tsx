'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Props {
  open: boolean;
  registrationId: number | null;
  studentName: string;
  onClose: () => void;
  onCancelled: () => Promise<void> | void;
}

// Dialog ยกเลิกการเช็คอินสำหรับ admin/super_admin pages
//   POST /api/admin/registrations/:id/cancel-check-in (super_admin only — gate ที่ backend)
//   มี textarea บังคับ reason
export function CancelCheckInDialog({
  open,
  registrationId,
  studentName,
  onClose,
  onCancelled,
}: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function execute() {
    if (!registrationId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('โปรดระบุเหตุผลในการยกเลิกเช็คอิน');
      return;
    }
    setBusy(true);
    try {
      await api.post(
        `/api/admin/registrations/${registrationId}/cancel-check-in`,
        { reason: trimmed },
      );
      toast.success(
        `ยกเลิกเช็คอินของ ${studentName} แล้ว — สถานะกลับเป็น "อนุมัติแล้ว"`,
      );
      setReason('');
      await onCancelled();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ยกเลิกเช็คอินไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="ยกเลิกการเช็คอิน?"
      message={
        <div className="space-y-3">
          <p>
            ยกเลิกการเช็คอินของ <strong>{studentName}</strong> — สถานะจะกลับเป็น{' '}
            <strong>"อนุมัติแล้ว"</strong> และหลักฐาน attendance จะถูก mark INVALID
            (เก็บ history ครบ)
          </p>
          <p className="text-xs text-amber-700">
            ทำได้เฉพาะกรณีที่ยังไม่ประเมินผล (ถ้าประเมินแล้วต้องยกเลิกผลประเมินก่อน)
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">
              เหตุผล (จำเป็น)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="เช่น สแกน QR ผิดคน, นิสิตไม่ได้เข้าร่วมจริง"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              autoFocus
            />
          </label>
        </div>
      }
      confirmLabel="ยกเลิกเช็คอิน"
      loading={busy}
      onConfirm={execute}
      onCancel={handleClose}
    />
  );
}
