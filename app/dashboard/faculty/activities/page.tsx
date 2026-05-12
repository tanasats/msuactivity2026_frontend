'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatActivityRange, formatNumber } from '@/lib/format';
import { StatusBadge, STATUS_LIST } from '@/components/faculty/StatusBadge';
import type { ActivityStatus, FacultyActivitySummary } from '@/lib/types';

interface AcademicYearsResponse {
  current: number;
  default_year: number;
  available: number[];
}

function FacultyActivitiesPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const status = (params.get('status') as ActivityStatus | null) ?? null;
  const mineOnly = params.get('mine') === 'true';
  const yearParam = params.get('academic_year');
  const academicYear =
    yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  const searchUrl = params.get('search')?.trim() ?? '';

  const [items, setItems] = useState<FacultyActivitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  // ปีการศึกษา dropdown — โหลดครั้งเดียว, default current ถ้า URL ยังไม่มี
  const [availableYears, setAvailableYears] = useState<number[] | null>(null);
  const yearsBootstrapped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AcademicYearsResponse>('/api/faculty/academic-years')
      .then((res) => {
        if (cancelled) return;
        setAvailableYears(res.data.available);
        // ถ้า URL ยังไม่มี academic_year → default ไป default_year (max ปีที่คณะมี
        // activity จริง) — ไม่ใช่ current ตรงๆ กันเคสคณะสร้างกิจกรรมล่วงหน้า
        if (!yearsBootstrapped.current && academicYear === null) {
          yearsBootstrapped.current = true;
          const def = res.data.default_year ?? res.data.current;
          updateFilter({ academic_year: def }, true);
        } else {
          yearsBootstrapped.current = true;
        }
      })
      .catch(() => {
        /* non-fatal — dropdown ใช้ค่าใน URL ไปก่อน */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // local search input — debounce 300ms → push เข้า URL (search param)
  const [searchInput, setSearchInput] = useState(searchUrl);
  useEffect(() => {
    // sync เมื่อ URL เปลี่ยนจากภายนอก (back/forward)
    setSearchInput(searchUrl);
  }, [searchUrl]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === searchUrl) return; // ไม่ตัวหวัด
    const t = setTimeout(() => {
      updateFilter({ search: trimmed === '' ? null : trimmed });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // race-guard: ใช้ seq กัน response เก่ามาแซง
  const fetchSeq = useRef(0);
  useEffect(() => {
    const my = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        if (mineOnly) qs.set('mine', 'true');
        if (academicYear !== null) qs.set('academic_year', String(academicYear));
        if (searchUrl) qs.set('search', searchUrl);
        const res = await api.get<{ items: FacultyActivitySummary[] }>(
          `/api/faculty/activities?${qs.toString()}`,
        );
        if (my !== fetchSeq.current) return;
        setItems(res.data.items);
      } catch (e: unknown) {
        if (my !== fetchSeq.current) return;
        const err = e as { response?: { status: number; data?: { message?: string } } };
        if (err.response?.status === 403) setAccessBlocked(true);
        else setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (my === fetchSeq.current) setLoading(false);
      }
    })();
  }, [status, mineOnly, academicYear, searchUrl]);

  // updateFilter: รักษาค่าอื่นไว้ + push URL state
  //   replace=true ใช้ตอน auto-bootstrap (default year) เพื่อไม่ทิ้ง history entry
  function updateFilter(
    next: {
      status?: ActivityStatus | null;
      mine?: boolean;
      academic_year?: number | null;
      search?: string | null;
    },
    replace = false,
  ) {
    const qs = new URLSearchParams();
    const newStatus = 'status' in next ? next.status : status;
    const newMine = 'mine' in next ? next.mine : mineOnly;
    const newYear =
      'academic_year' in next ? next.academic_year : academicYear;
    const newSearch =
      'search' in next ? next.search : searchUrl === '' ? null : searchUrl;

    if (newStatus) qs.set('status', newStatus);
    if (newMine) qs.set('mine', 'true');
    if (newYear !== null && newYear !== undefined)
      qs.set('academic_year', String(newYear));
    if (newSearch) qs.set('search', newSearch);

    const url =
      qs.toString() === ''
        ? '/dashboard/faculty/activities'
        : `/dashboard/faculty/activities?${qs.toString()}`;
    if (replace) router.replace(url);
    else router.push(url);
  }

  function clearAll() {
    setSearchInput('');
    // เก็บปี = current ไว้ (default UX) — ล้างแค่ status/mine/search
    const yr = availableYears?.[0] ?? academicYear;
    const qs = new URLSearchParams();
    if (yr !== null && yr !== undefined) qs.set('academic_year', String(yr));
    router.push(
      qs.toString()
        ? `/dashboard/faculty/activities?${qs.toString()}`
        : '/dashboard/faculty/activities',
    );
  }

  if (accessBlocked) {
    return (
      <Container>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm text-amber-900">
            บัญชีของท่านยังไม่ถูกผูกกับคณะ — โปรดติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </Container>
    );
  }

  const hasNonDefaultFilter = !!(status || mineOnly || searchUrl);

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">กิจกรรม</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mineOnly ? 'เฉพาะที่ท่านสร้าง' : 'ทุกกิจกรรมในคณะ'}
            {academicYear !== null && (
              <span className="ml-1 text-gray-400">
                · ปีการศึกษา {academicYear}
              </span>
            )}
            {status && (
              <span className="ml-1 text-gray-400">
                · {STATUS_LIST.find((s) => s.value === status)?.label}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/faculty/activities/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + สร้างกิจกรรมใหม่
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-5 grid gap-2 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-12">
        {/* search */}
        <div className="relative md:col-span-5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา ชื่อกิจกรรม / รหัส"
            aria-label="ค้นหากิจกรรม"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-9 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {searchInput.trim() !== searchUrl && searchInput.length > 0 && (
            <Loader2
              className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
              aria-hidden
            />
          )}
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
              aria-label="ล้างค่าค้นหา"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* academic year */}
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-3">
          <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="text-gray-500">ปีการศึกษา</span>
          <select
            value={academicYear ?? ''}
            onChange={(e) =>
              updateFilter({
                academic_year: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            disabled={!availableYears}
            className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none disabled:opacity-50"
            aria-label="เลือกปีการศึกษา"
          >
            <option value="">ทุกปี</option>
            {availableYears === null && academicYear !== null && (
              <option value={academicYear}>{academicYear}</option>
            )}
            {availableYears?.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {/* status */}
        <select
          value={status ?? ''}
          onChange={(e) => {
            const v = e.target.value as ActivityStatus | '';
            updateFilter({ status: v === '' ? null : v });
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 md:col-span-2"
          aria-label="กรองสถานะ"
        >
          <option value="">ทุกสถานะ</option>
          {STATUS_LIST.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* mine only */}
        <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => updateFilter({ mine: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          เฉพาะของฉัน
        </label>

        {hasNonDefaultFilter && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:underline md:col-span-12 md:text-right"
          >
            ล้างตัวกรอง (เก็บปีการศึกษาไว้)
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {items && (
        <p className="mb-2 text-xs text-gray-500">
          พบ <span className="font-semibold text-gray-900">{items.length}</span> รายการ
        </p>
      )}

      <div className="relative">
        {!items && !error && <TableSkeleton />}

        {items && items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            ไม่พบกิจกรรมตามตัวกรอง
          </div>
        )}

        {items && items.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">ชื่อกิจกรรม</th>
                  <th className="px-4 py-3 text-left">หน่วยงาน</th>
                  <th className="px-4 py-3 text-left">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-left">ช่วงเวลาจัด</th>
                  <th className="px-4 py-3 text-right">ผู้สมัคร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={a.status} />
                        {a.is_mine && (
                          <span className="self-start rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            ของฉัน
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/dashboard/faculty/activities/${a.id}`}
                        className="font-medium text-gray-900 hover:text-blue-700"
                      >
                        {a.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {a.category_name}
                        {a.code && (
                          <span className="ml-2 font-mono text-[11px] text-gray-400">
                            {a.code}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      <span className="font-mono text-xs text-gray-500">
                        {a.organization_code}
                      </span>
                      <p className="text-xs text-gray-700">{a.organization_name}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {a.created_by_name}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
                      {formatActivityRange(a.start_at, a.end_at)}
                    </td>
                    <td className="px-4 py-3 text-right align-top tabular-nums text-gray-700">
                      {formatNumber(a.registered_count)}/
                      {formatNumber(a.capacity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* loading overlay (refetch) — เก็บข้อมูลเก่าไว้ + spinner กลาง */}
        {loading && items && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]">
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md ring-1 ring-gray-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden />
              กำลังโหลด...
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

export default function FacultyActivitiesPage() {
  // useSearchParams ต้องอยู่ใน Suspense (Next.js 15 requirement)
  return (
    <Suspense
      fallback={
        <Container>
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
        </Container>
      }
    >
      <FacultyActivitiesPageInner />
    </Suspense>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-full p-6 md:p-8">{children}</div>;
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
