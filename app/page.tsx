'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { LayoutDashboard } from 'lucide-react';
import type { ActivitySummary, PublicStats } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { ActivityCard } from '@/components/ActivityCard';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ใช้ axios แยก instance — landing page ไม่ต้องการ bearer token / refresh interceptor
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

interface LandingData {
  stats: PublicStats;
  open: ActivitySummary[];
  upcoming: ActivitySummary[];
}

async function loadLandingData(): Promise<LandingData> {
  const [statsRes, openRes, upcomingRes] = await Promise.all([
    publicApi.get<PublicStats>('/api/public/stats'),
    publicApi.get<{ items: ActivitySummary[] }>('/api/public/activities', {
      params: { filter: 'open', limit: 6 },
    }),
    publicApi.get<{ items: ActivitySummary[] }>('/api/public/activities', {
      params: { filter: 'upcoming', limit: 12 },
    }),
  ]);
  // ซ่อน duplicate: upcoming ที่อยู่ใน open อยู่แล้ว ไม่ต้องโชว์ซ้ำ
  const openIds = new Set(openRes.data.items.map((a) => a.id));
  const upcomingDeduped = upcomingRes.data.items
    .filter((a) => !openIds.has(a.id))
    .slice(0, 6);
  return {
    stats: statsRes.data,
    open: openRes.data.items,
    upcoming: upcomingDeduped,
  };
}

export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // bootstrap session — ถ้ามี refresh token cookie ที่ valid อยู่จะ fetch /me แล้วเซ็ต user
  // เปิดใช้ตรงนี้เพื่อให้หน้า landing รู้ว่าผู้ใช้ login อยู่หรือไม่
  useAuthBootstrap();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    let cancelled = false;
    loadLandingData()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลได้ — โปรดตรวจสอบการเชื่อมต่อ');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              M
            </div>
            <span className="font-semibold text-gray-900">MSU Activity</span>
          </div>
          {/* ถ้า login อยู่แล้ว → ปุ่มกลับ Dashboard (ใช้ /dashboard ที่ smart-redirect ตาม role)
              ถ้า bootstrap ยังไม่จบ → render placeholder ขนาดเดียวกัน กัน layout shift */}
          {isBootstrapping ? (
            <span
              aria-hidden
              className="h-8 w-28 animate-pulse rounded-lg bg-gray-100"
            />
          ) : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              กลับไปที่ Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
          ระบบจัดการกิจกรรมนิสิต
          <br className="hidden md:block" />
          <span className="text-blue-700"> มหาวิทยาลัยมหาสารคาม</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 md:text-lg">
          ค้นหาและสมัครเข้าร่วมกิจกรรม เพื่อเก็บชั่วโมง และพัฒนาทักษะตามมาตรฐานมหาวิทยาลัย
        </p>
        {/* <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-blue-700"
          >
            เข้าสู่ระบบเพื่อสมัครกิจกรรม
          </Link>
          <a
            href="#open-activities"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            ดูกิจกรรมทั้งหมด
          </a>
        </div> */}
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mx-auto max-w-md rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-700">
            {error}
          </div>
        )}
        {!data && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}
        {data && (
          <>
            {/* <p className="mb-3 text-center text-sm text-gray-500">
              สถิติปีการศึกษา {data.stats.academic_year}
            </p> */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="จำนวนกิจกรรม"
                value={formatNumber(data.stats.activities_count)}
                hint={`ในปีการศึกษา ${data.stats.academic_year}`}
              />
              <StatCard
                label="จำนวนผู้ลงทะเบียน"
                value={formatNumber(data.stats.registrations_count)}
                hint="ครั้ง"
              />
              <StatCard
                label="จำนวนสมาชิกในระบบ"
                value={formatNumber(data.stats.members_count)}
                hint="บัญชีที่เปิดใช้งาน"
              />
            </div>
          </>
        )}
      </section>

      {/* Open activities */}
      <section id="open-activities" className="mx-auto max-w-6xl px-6 py-10">
        <SectionHeader title="กำลังเปิดรับสมัคร" subtitle="สมัครได้ตอนนี้" />
        {!data && !error && <CardSkeletonGrid />}
        {data && data.open.length === 0 && (
          <EmptyState message="ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร" />
        )}
        {data && data.open.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.open.map((a) => (
              <ActivityCard key={a.id} activity={a} variant="open" />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming activities */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SectionHeader
          title="กิจกรรมที่กำลังจะเปิดรับสมัคร"
          subtitle="ยังไม่เริ่ม / ยังไม่เปิดรับสมัคร"
        />
        {!data && !error && <CardSkeletonGrid />}
        {data && data.upcoming.length === 0 && (
          <EmptyState message="ยังไม่มีกิจกรรมในรายการ" />
        )}
        {data && data.upcoming.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcoming.map((a) => (
              <ActivityCard key={a.id} activity={a} variant="upcoming" />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} มหาวิทยาลัยมหาสารคาม — ระบบจัดการกิจกรรมนิสิต
        </div>
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-7xl font-bold text-blue-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function CardSkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
