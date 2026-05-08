'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatActivityRange, formatNumber } from '@/lib/format';
import { StatusBadge, STATUS_LIST } from '@/components/faculty/StatusBadge';
import type { ActivityStatus, FacultyActivitySummary } from '@/lib/types';

function FacultyActivitiesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') as ActivityStatus | null;
  const mineOnly = params.get('mine') === 'true';

  const [items, setItems] = useState<FacultyActivitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        if (mineOnly) qs.set('mine', 'true');
        const res = await api.get<{ items: FacultyActivitySummary[] }>(
          `/api/faculty/activities?${qs.toString()}`,
        );
        if (cancelled) return;
        setItems(res.data.items);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status: number; data?: { message?: string } } };
        if (err.response?.status === 403) setAccessBlocked(true);
        else setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, mineOnly]);

  function setFilter(next: { status?: ActivityStatus | null; mine?: boolean }) {
    const qs = new URLSearchParams();
    const newStatus = next.status === undefined ? status : next.status;
    const newMine = next.mine === undefined ? mineOnly : next.mine;
    if (newStatus) qs.set('status', newStatus);
    if (newMine) qs.set('mine', 'true');
    const url =
      qs.toString() === ''
        ? '/dashboard/faculty/activities'
        : `/dashboard/faculty/activities?${qs.toString()}`;
    router.replace(url);
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

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">กิจกรรม</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mineOnly ? 'เฉพาะที่ท่านสร้าง' : 'ทุกกิจกรรมในคณะ'}
            {status && ` · สถานะ: ${STATUS_LIST.find((s) => s.value === status)?.label}`}
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
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setFilter({ mine: e.target.checked })}
            className="rounded border-gray-300"
          />
          เฉพาะที่ฉันสร้าง
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">สถานะ:</span>
          <select
            value={status ?? ''}
            onChange={(e) => {
              const v = e.target.value as ActivityStatus | '';
              setFilter({ status: v === '' ? null : v });
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            <option value="">ทั้งหมด</option>
            {STATUS_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {(status || mineOnly) && (
          <button
            onClick={() => router.replace('/dashboard/faculty/activities')}
            className="ml-auto text-sm text-gray-500 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && !error && <TableSkeleton />}

      {items && items.length === 0 && (
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
                    <p className="text-xs text-gray-500">{a.category_name}</p>
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
