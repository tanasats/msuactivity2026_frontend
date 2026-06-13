import type { ReactNode } from 'react';
import { formatNumber } from '@/lib/format';

// ── Shared chart primitives (proportion bar style) ────────────────
//   ใช้ใน landing page + admin student detail
//   - palette: rainbow 5 สี (rose / amber / emerald / sky / violet)
//   - card shell: rounded-2xl + border + shadow-sm
//   - bar: horizontal proportion with right-aligned count + percentage

// padding responsive: p-4 บนมือถือ ลดความแออัด, p-5 บน sm+
export const CHART_CARD =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';

// rainbow 5 สี — โทนกลาง (400) เพื่อให้ผ่อนตา + เด่นพอบนพื้นขาว
export const RAINBOW_PALETTE = [
  'bg-rose-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-violet-400',
];

export function ChartHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

// ── ProportionBar — horizontal bar แบบ proportion (%) หรือไม่ก็ได้ ───
//   - total > 0 → แสดง % ในวงเล็บ; total = 0 → ไม่แสดง %
//   - max = ค่ามากสุดของ series → ใช้ scale bar (ให้แถวที่มากสุด = เต็มกล่อง)
//   - colorClass = bg-* จาก RAINBOW_PALETTE หรือสีอื่นตามต้องการ
//   - countSuffix = หน่วยข้างหลังตัวเลข (เช่น "ชม.", "คน", "")
export function ProportionBar({
  label,
  count,
  total,
  max,
  colorClass,
  countSuffix = '',
}: {
  // ReactNode รองรับทั้ง string ปกติ + JSX ที่ responsive (เช่น show code mobile, ชื่อเต็ม desktop)
  label: ReactNode;
  count: number;
  total: number;
  max: number;
  colorClass: string;
  countSuffix?: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barPct = (count / max) * 100;
  return (
    <div className="min-w-0">
      {/* flex row — label ซ้าย (หดได้ + truncate), count ขวา (shrink-0)
            ต้องมี min-w-0 บน label ไม่งั้น truncate ไม่ทำงานบน flex */}
      <div className="mb-1 flex items-center gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-medium text-gray-700">
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-gray-600">
          {formatNumber(count)}
          {countSuffix && <span className="ml-1 text-gray-500">{countSuffix}</span>}
          {total > 0 && (
            <span className="ml-1 text-gray-400">({pct.toFixed(1)}%)</span>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}
