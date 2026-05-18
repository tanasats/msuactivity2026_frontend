import { formatNumber } from '@/lib/format';

// ── Shared chart primitives (proportion bar style) ────────────────
//   ใช้ใน landing page + admin student detail
//   - palette: rainbow 5 สี (rose / amber / emerald / sky / violet)
//   - card shell: rounded-2xl + border + shadow-sm
//   - bar: horizontal proportion with right-aligned count + percentage

export const CHART_CARD =
  'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';

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
  label: string;
  count: number;
  total: number;
  max: number;
  colorClass: string;
  countSuffix?: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barPct = (count / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate font-medium text-gray-700">{label}</span>
        <span className="ml-2 shrink-0 tabular-nums text-gray-600">
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
