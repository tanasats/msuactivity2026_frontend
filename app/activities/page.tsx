'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ActivitySummary, PublicActivityListResponse } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { ActivityCard } from '@/components/ActivityCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
// public axios แยก — หน้านี้ไม่ต้องการ bearer/refresh interceptor
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

const PAGE_SIZE = 24;

type Filter = 'open' | 'upcoming';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'กำลังเปิดรับสมัคร' },
  { key: 'upcoming', label: 'กำลังจะเปิดรับสมัคร' },
];

function ActivitiesBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  // filter จาก URL — default 'open' ถ้าค่าไม่ถูกต้อง
  const filter: Filter = params.get('filter') === 'upcoming' ? 'upcoming' : 'open';

  const [items, setItems] = useState<ActivitySummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // race-guard: bump ทุกครั้งที่ filter เปลี่ยน → ทิ้งผลลัพธ์เก่าที่ค้าง
  const seq = useRef(0);

  // โหลดหน้าแรกใหม่ทุกครั้งที่ filter เปลี่ยน
  useEffect(() => {
    const s = ++seq.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setTotal(null);
    publicApi
      .get<PublicActivityListResponse>('/api/public/activities', {
        params: { filter, limit: PAGE_SIZE, offset: 0 },
      })
      .then((res) => {
        if (s !== seq.current) return;
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => {
        if (s !== seq.current) return;
        setError('ไม่สามารถโหลดข้อมูลได้ — โปรดลองใหม่');
      })
      .finally(() => {
        if (s === seq.current) setLoading(false);
      });
  }, [filter]);

  const loadMore = useCallback(() => {
    const s = seq.current; // ใช้ guard เดียวกับ view ปัจจุบัน (filter เปลี่ยน → bump → ทิ้งผล)
    setLoadingMore(true);
    publicApi
      .get<PublicActivityListResponse>('/api/public/activities', {
        params: { filter, limit: PAGE_SIZE, offset: items.length },
      })
      .then((res) => {
        if (s !== seq.current) return;
        setItems((prev) => [...prev, ...res.data.items]);
        setTotal(res.data.total);
      })
      .catch(() => {
        /* เงียบไว้ — ปุ่มยังกดใหม่ได้ */
      })
      .finally(() => {
        if (s === seq.current) setLoadingMore(false);
      });
  }, [filter, items.length]);

  const switchFilter = (f: Filter) => {
    if (f === filter) return;
    router.replace(`/activities?filter=${f}`);
  };

  const hasMore = total !== null && items.length < total;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          กิจกรรมทั้งหมด
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          เลือกดูกิจกรรมที่เปิดรับสมัคร หรือกำลังจะเปิดรับสมัคร
        </p>

        {/* Filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => switchFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f.label}
                {active && total !== null && (
                  <span className="ml-1.5 tabular-nums">({formatNumber(total)})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* States */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto max-w-md rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            {filter === 'open'
              ? 'ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร'
              : 'ยังไม่มีกิจกรรมที่กำลังจะเปิดรับสมัคร'}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <ActivityCard key={a.id} activity={a} variant={filter} />
              ))}
            </div>

            {/* Load more */}
            <div className="mt-8 flex flex-col items-center gap-2">
              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  แสดงเพิ่มเติม
                </button>
              ) : (
                total !== null && (
                  <p className="text-sm text-gray-400">แสดงครบทั้งหมดแล้ว</p>
                )
              )}
              {total !== null && (
                <p className="text-xs text-gray-400">
                  แสดง {formatNumber(items.length)} จาก {formatNumber(total)} กิจกรรม
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-blue-50">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
        </main>
      }
    >
      <ActivitiesBrowser />
    </Suspense>
  );
}
