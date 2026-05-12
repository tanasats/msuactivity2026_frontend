'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  HourglassIcon,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatNumber } from '@/lib/format';
import { StatusBadge } from '@/components/faculty/StatusBadge';
import type {
  ActivityStatus,
  AdminActivitySummary,
  AdminStats,
} from '@/lib/types';

interface AcademicYearsResponse {
  current: number;
  default_year: number;
  available: number[];
}

const STATUS_HIGHLIGHTS: {
  status: ActivityStatus;
  label: string;
  Icon: typeof FileEdit;
  iconClass: string;
}[] = [
  {
    status: 'DRAFT',
    label: 'ฉบับร่าง',
    Icon: FileEdit,
    iconClass: 'bg-gray-100 text-gray-600',
  },
  {
    status: 'PENDING_APPROVAL',
    label: 'รออนุมัติ',
    Icon: HourglassIcon,
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    status: 'WORK',
    label: 'ดำเนินการ',
    Icon: ClipboardList,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    status: 'COMPLETED',
    label: 'เสร็จสิ้น',
    Icon: CheckCircle2,
    iconClass: 'bg-slate-200 text-slate-700',
  },
];

export default function AdminOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const [statsData, setStatsData] = useState<AdminStats | null>(null);
  const [pendingItems, setPendingItems] = useState<
    AdminActivitySummary[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [academicYear, setAcademicYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AcademicYearsResponse>(
          '/api/admin/academic-years',
        );
        if (cancelled) return;
        setAvailableYears(res.data.available);
        setAcademicYear(res.data.default_year ?? res.data.current);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดข้อมูลปีไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || academicYear === null) return;
    let cancelled = false;
    (async () => {
      try {
        const yearParam = `academic_year=${academicYear}`;
        const [statsRes, pendingRes] = await Promise.all([
          api.get<AdminStats>(`/api/admin/stats?${yearParam}`),
          api.get<{ items: AdminActivitySummary[]; total: number }>(
            `/api/admin/activities?status=PENDING_APPROVAL&limit=5&${yearParam}`,
          ),
        ]);
        if (cancelled) return;
        setStatsData(statsRes.data);
        setPendingItems(pendingRes.data.items);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, academicYear]);

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-500">
            สถิติกิจกรรมทุกคณะ + รายการที่รออนุมัติ
            {academicYear !== null && (
              <span className="ml-1.5 text-gray-400">
                · ปีการศึกษา {academicYear}
              </span>
            )}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm">
          <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="text-gray-600">ปีการศึกษา</span>
          <select
            value={academicYear ?? ''}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
            disabled={availableYears.length === 0}
            className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
            aria-label="เลือกปีการศึกษา"
          >
            {availableYears.length === 0 && academicYear !== null && (
              <option value={academicYear}>{academicYear}</option>
            )}
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Stats grid — 1 card รวม + 4 cards ตาม status */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          สถิติกิจกรรม (ทุกคณะ)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <TotalCard
            value={
              statsData
                ? STATUS_HIGHLIGHTS.reduce(
                    (sum, h) => sum + statsData.counts[h.status],
                    0,
                  )
                : null
            }
            academicYear={academicYear}
          />
          {STATUS_HIGHLIGHTS.map((h) => (
            <StatusCard
              key={h.status}
              label={h.label}
              value={statsData ? statsData.counts[h.status] : null}
              status={h.status}
              Icon={h.Icon}
              iconClass={h.iconClass}
              academicYear={academicYear}
            />
          ))}
        </div>
      </section>

      {/* Pending approval queue — quick list ของกิจกรรมที่รออนุมัติ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            รออนุมัติล่าสุด
          </h2>
          <Link
            href="/dashboard/admin/activities?status=PENDING_APPROVAL"
            className="text-sm text-indigo-600 hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {!pendingItems && !error && <ListSkeleton />}

        {pendingItems && pendingItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            ไม่มีกิจกรรมที่รออนุมัติในปีการศึกษานี้
          </div>
        )}

        {pendingItems && pendingItems.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {pendingItems.map((a) => (
                <li key={a.id} className="px-5 py-3 hover:bg-gray-50">
                  <Link
                    href={`/dashboard/admin/activities/${a.id}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={a.status} />
                        {a.faculty_name && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {a.faculty_name}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {a.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {a.organization_name} · โดย {a.created_by_name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatNumber(a.registered_count)}/
                      {formatNumber(a.capacity)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// "รวม" card — สรุปยอดทุก status ของปีที่เลือก
//   ใช้สี indigo เน้นเป็น highlight + icon Layers (ซ้อนกันสื่อว่ารวมหลาย status)
//   click → list ทุก status ของปีนั้น (ไม่ filter status)
function TotalCard({
  value,
  academicYear,
}: {
  value: number | null;
  academicYear: number | null;
}) {
  const params = new URLSearchParams();
  if (academicYear !== null) params.set('academic_year', String(academicYear));
  const href =
    params.toString() === ''
      ? '/dashboard/admin/activities'
      : `/dashboard/admin/activities?${params.toString()}`;
  return (
    <Link
      href={href}
      className="block rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 shadow-sm transition hover:border-indigo-400 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Layers className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-indigo-700">รวมทั้งหมด</p>
          <p className="mt-0.5 text-2xl font-bold text-indigo-900">
            {value === null ? '–' : formatNumber(value)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function StatusCard({
  label,
  value,
  status,
  Icon,
  iconClass,
  academicYear,
}: {
  label: string;
  value: number | null;
  status: ActivityStatus;
  Icon: typeof FileEdit;
  iconClass: string;
  academicYear: number | null;
}) {
  const params = new URLSearchParams({ status });
  if (academicYear !== null) params.set('academic_year', String(academicYear));
  return (
    <Link
      href={`/dashboard/admin/activities?${params.toString()}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {value === null ? '–' : formatNumber(value)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
