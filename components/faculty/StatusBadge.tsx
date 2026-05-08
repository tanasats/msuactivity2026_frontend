import type { ActivityStatus } from '@/lib/types';

const STATUS_LABEL: Record<ActivityStatus, { th: string; tone: string }> = {
  DRAFT: { th: 'ฉบับร่าง', tone: 'bg-gray-100 text-gray-700' },
  PENDING_APPROVAL: { th: 'รออนุมัติ', tone: 'bg-amber-100 text-amber-800' },
  WORK: { th: 'ดำเนินการ', tone: 'bg-emerald-100 text-emerald-800' },
  COMPLETED: { th: 'เสร็จสิ้น', tone: 'bg-slate-200 text-slate-800' },
};

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const meta = STATUS_LABEL[status] ?? STATUS_LABEL.DRAFT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.tone}`}
    >
      {meta.th}
    </span>
  );
}

export const STATUS_LIST: { value: ActivityStatus; label: string }[] = (
  Object.keys(STATUS_LABEL) as ActivityStatus[]
).map((s) => ({ value: s, label: STATUS_LABEL[s].th }));
