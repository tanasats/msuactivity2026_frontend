'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatNumber } from '@/lib/format';
import { StatusBadge } from '@/components/faculty/StatusBadge';
import type {
  ActivityStatus,
  FacultyActivitySummary,
  FacultyStats,
} from '@/lib/types';

interface AcademicYearsResponse {
  current: number;
  default_year: number;
  available: number[];
}

const STATUS_HIGHLIGHTS: { status: ActivityStatus; label: string }[] = [
  { status: 'DRAFT', label: 'ฉบับร่าง' },
  { status: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
  { status: 'WORK', label: 'ดำเนินการ' },
  { status: 'COMPLETED', label: 'เสร็จสิ้น' },
];

export default function FacultyOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<FacultyStats | null>(null);
  const [recent, setRecent] = useState<FacultyActivitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);

  // ปีการศึกษาที่กำลังเลือกอยู่ (BE) — null ระหว่างโหลด available years
  // default = current academic year ที่ backend คำนวณจากวันที่
  const [academicYear, setAcademicYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // โหลด academic years ครั้งเดียวตอน mount — ตั้ง default = current
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AcademicYearsResponse>(
          '/api/faculty/academic-years',
        );
        if (cancelled) return;
        setAvailableYears(res.data.available);
        setAcademicYear(res.data.default_year ?? res.data.current);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status: number } };
        if (err.response?.status === 403) {
          setAccessBlocked(true);
        }
        // error อื่น ๆ ปล่อยผ่าน — useEffect ถัดไปจะลอง fetch stats อีกที
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
        const [statsRes, listRes] = await Promise.all([
          api.get<FacultyStats>(`/api/faculty/stats?${yearParam}`),
          api.get<{ items: FacultyActivitySummary[] }>(
            `/api/faculty/activities?limit=5&${yearParam}`,
          ),
        ]);
        if (cancelled) return;
        setStats(statsRes.data);
        setRecent(listRes.data.items);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status: number; data?: { message?: string } } };
        if (err.response?.status === 403) {
          setAccessBlocked(true);
        } else {
          setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, academicYear]);

  if (accessBlocked) {
    return (
      <Container>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold text-amber-900">
            ไม่สามารถใช้งาน Dashboard ได้
          </h2>
          <p className="text-sm text-amber-800">
            บัญชีของท่านยังไม่ถูกผูกกับคณะ
            <br />
            โปรดติดต่อผู้ดูแลระบบเพื่อตั้งค่าคณะของท่าน
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">ภาพรวม</h1>
          <p className="text-sm text-gray-500">
            งานของคณะและงานของท่าน
            {academicYear !== null && (
              <span className="ml-1.5 text-gray-400">
                · ปีการศึกษา {academicYear}
              </span>
            )}
          </p>
        </div>

        {/* Academic year selector — default = current; เปลี่ยนแล้ว stats + recent reload อัตโนมัติ */}
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

      {/* Stats grid */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">งานของฉัน</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_HIGHLIGHTS.map((h) => (
            <StatCard
              key={h.status}
              label={h.label}
              value={stats ? stats.mine[h.status] : null}
              status={h.status}
              context="mine"
              academicYear={academicYear}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">งานทั้งคณะ</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_HIGHLIGHTS.map((h) => (
            <StatCard
              key={h.status}
              label={h.label}
              value={stats ? stats.faculty[h.status] : null}
              status={h.status}
              context="faculty"
              academicYear={academicYear}
            />
          ))}
        </div>
      </section>

      {/* CTA — สร้างกิจกรรม */}
      <section className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-blue-900">
              ต้องการสร้างกิจกรรมใหม่?
            </h2>
            <p className="mt-1 text-sm text-blue-800">
              เริ่มจากร่าง (DRAFT) แก้ได้ก่อนส่งให้ admin อนุมัติ
            </p>
          </div>
          <Link
            href="/dashboard/faculty/activities/new"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            สร้างกิจกรรมใหม่
          </Link>
        </div>
      </section>

      {/* Recent activities */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            กิจกรรมล่าสุดในคณะ
          </h2>
          <Link
            href="/dashboard/faculty/activities"
            className="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        {!recent && !error && <ListSkeleton />}
        {recent && recent.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            ยังไม่มีกิจกรรมในคณะนี้
          </div>
        )}
        {recent && recent.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {recent.map((a) => (
                <li key={a.id} className="px-5 py-3 hover:bg-gray-50">
                  <Link
                    href={`/dashboard/faculty/activities/${a.id}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={a.status} />
                        {a.is_mine && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            ของฉัน
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
                      {formatNumber(a.registered_count)}/{formatNumber(a.capacity)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-full p-6 md:p-8">{children}</div>;
}

function StatCard({
  label,
  value,
  status,
  context,
  academicYear,
}: {
  label: string;
  value: number | null;
  status: ActivityStatus;
  context: 'mine' | 'faculty';
  academicYear: number | null;
}) {
  const params = new URLSearchParams({ status });
  if (context === 'mine') params.set('mine', 'true');
  if (academicYear !== null) params.set('academic_year', String(academicYear));
  return (
    <Link
      href={`/dashboard/faculty/activities?${params.toString()}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value === null ? '–' : formatNumber(value)}
      </p>
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
