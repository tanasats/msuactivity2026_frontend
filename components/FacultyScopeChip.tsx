import { GraduationCap, Users } from 'lucide-react';

export type EligibleFaculty = { id: number; code: string; name: string };

// chip บอกขอบเขตคณะที่เปิดรับ — อ่านจาก eligible_faculties ([] = ทุกคณะ)
//   undefined = payload ไม่ส่ง field นี้มา → ไม่แสดง
//   length 0  → "ทุกคณะ" (เขียว — เปิดกว้าง)
//   length 1  → "เฉพาะ <ชื่อคณะ>" (คราม — จำกัด)
//   length >1 → "<n> คณะ" (คราม — จำกัดบางคณะ) — hover ดูรายชื่อครบใน title
export function FacultyScopeChip({
  faculties,
}: {
  faculties: EligibleFaculty[] | undefined;
}) {
  if (faculties === undefined) return null;
  const isAll = faculties.length === 0;
  const label = isAll
    ? 'ทุกคณะ'
    : faculties.length === 1
      ? `เฉพาะ ${faculties[0].name}`
      : `${faculties.length} คณะ`;
  const title = isAll
    ? 'เปิดรับทุกคณะ / สาขา'
    : faculties.map((f) => `${f.code} — ${f.name}`).join('\n');
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAll ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
      }`}
    >
      {isAll ? (
        <Users className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <GraduationCap className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
