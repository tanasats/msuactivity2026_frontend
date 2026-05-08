'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

type Tone = 'default' | 'danger';

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// reusable confirmation modal
//   - backdrop click + Esc → onCancel (ถ้าไม่ loading)
//   - tone='danger' → ปุ่มยืนยันสีแดง + ไอคอน AlertTriangle
//   - tone='default' → ปุ่มน้ำเงิน + ไอคอน HelpCircle
//   - focus auto ไปที่ปุ่มยืนยันเมื่อเปิด
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  // ESC ปิด dialog (skip ถ้า loading)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  // focus ปุ่ม confirm ตอนเปิด
  useEffect(() => {
    if (open) confirmBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const Icon = tone === 'danger' ? AlertTriangle : HelpCircle;
  const iconBgClass =
    tone === 'danger'
      ? 'bg-rose-100 text-rose-600'
      : 'bg-blue-100 text-blue-600';
  const confirmBtnClass =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onCancel()}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          aria-label="ปิด"
          disabled={loading}
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBgClass}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              {title}
            </h2>
            <div className="mt-1 text-sm text-gray-600">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${confirmBtnClass}`}
          >
            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
