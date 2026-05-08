'use client';

import { useEffect } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastItem } from '@/lib/toast';

const AUTO_DISMISS_MS = 4000;

// Toast container — fixed มุมขวาบน, stack แนวตั้ง, auto-dismiss + click ปิด
export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  // auto-dismiss
  useEffect(() => {
    const id = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [onClose]);

  const Icon = item.ok ? CheckCircle2 : XCircle;
  const toneClass = item.ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div
      role={item.ok ? 'status' : 'alert'}
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-md backdrop-blur ${toneClass}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="-m-1 shrink-0 rounded p-1 opacity-60 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
