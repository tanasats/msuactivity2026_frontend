'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ClipboardList,
  LayoutDashboard,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import type { ActivitySummary, LandingStats } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { ActivityCard } from '@/components/ActivityCard';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ใช้ axios แยก instance — landing page ไม่ต้องการ bearer token / refresh interceptor
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

interface LandingData {
  stats: LandingStats;
  open: ActivitySummary[];
  upcoming: ActivitySummary[];
}

async function loadLandingData(): Promise<LandingData> {
  const [statsRes, openRes, upcomingRes] = await Promise.all([
    publicApi.get<LandingStats>('/api/public/landing-stats'),
    publicApi.get<{ items: ActivitySummary[] }>('/api/public/activities', {
      params: { filter: 'open', limit: 12 },
    }),
    publicApi.get<{ items: ActivitySummary[] }>('/api/public/activities', {
      params: { filter: 'upcoming', limit: 18 },
    }),
  ]);
  // ซ่อน duplicate: upcoming ที่อยู่ใน open อยู่แล้ว ไม่ต้องโชว์ซ้ำ
  const openIds = new Set(openRes.data.items.map((a) => a.id));
  const upcomingDeduped = upcomingRes.data.items
    .filter((a) => !openIds.has(a.id))
    .slice(0, 12);
  return {
    stats: statsRes.data,
    open: openRes.data.items,
    upcoming: upcomingDeduped,
  };
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LEN = 2;

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
];

export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // searchInput = ที่ user พิมพ์, search = ค่าที่ผ่าน debounce แล้วส่ง backend
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ActivitySummary[] | null>(null);
  const [searching, setSearching] = useState(false);

  useAuthBootstrap();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  // initial: stats + open + upcoming
  useEffect(() => {
    let cancelled = false;
    loadLandingData()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled)
          setError('ไม่สามารถโหลดข้อมูลได้ — โปรดตรวจสอบการเชื่อมต่อ');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // debounce searchInput → search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ทุกครั้งที่ search เปลี่ยน → query backend (race-guard)
  const fetchSeq = useRef(0);
  useEffect(() => {
    if (search.length < MIN_SEARCH_LEN) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const seq = ++fetchSeq.current;
    setSearching(true);
    publicApi
      .get<{ items: ActivitySummary[] }>('/api/public/activities/search', {
        params: { q: search, limit: 30 },
      })
      .then((res) => {
        if (seq !== fetchSeq.current) return;
        setSearchResults(res.data.items);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setSearchResults([]);
      })
      .finally(() => {
        if (seq === fetchSeq.current) setSearching(false);
      });
  }, [search]);

  const isSearching = search.length >= MIN_SEARCH_LEN;

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

      {/* Hero + search */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-6 text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
          ระบบจัดการกิจกรรมนิสิต
          <br className="hidden md:block" />
          <span className="text-blue-700"> มหาวิทยาลัยมหาสารคาม</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-base text-gray-600 md:text-lg">
          ค้นหาและสมัครเข้าร่วมกิจกรรม เพื่อเก็บชั่วโมง และพัฒนาทักษะตามมาตรฐานมหาวิทยาลัย
        </p>
        <div className="mx-auto max-w-xl">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหากิจกรรม (ชื่อ / รหัส / สถานที่ / หน่วยงาน)"
              aria-label="ค้นหากิจกรรม"
              className="w-full rounded-full border border-gray-300 bg-white py-3 pl-12 pr-12 text-base shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {/* spinner ระหว่าง debounce + searching */}
            {(searching || (searchInput.trim() !== search && searchInput.length >= MIN_SEARCH_LEN)) && (
              <Loader2
                className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
                aria-hidden
              />
            )}
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="ล้างค่าค้นหา"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* hint ตอนพิมพ์ตัวเดียว — บอกว่าต้องอย่างน้อย 2 ตัว */}
          {searchInput.trim().length === 1 && (
            <p className="mt-2 text-xs text-gray-400">
              พิมพ์อย่างน้อย {MIN_SEARCH_LEN} ตัวอักษรเพื่อค้น
            </p>
          )}
        </div>
      </section>

      {/* Stats — 2 cards */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mx-auto max-w-md rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-700">
            {error}
          </div>
        )}
        {!data && !error && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}
        {data && (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={<ClipboardList className="h-6 w-6" aria-hidden />}
              label="จำนวนกิจกรรม"
              value={formatNumber(data.stats.activities_count)}
              hint="ที่ดำเนินการ + เสร็จสิ้นแล้ว (ทุกปีการศึกษา)"
              tone="blue"
            />
            <StatCard
              icon={<Users className="h-6 w-6" aria-hidden />}
              label="จำนวนผู้ใช้งาน"
              value={formatNumber(data.stats.members_count)}
              hint="บัญชีที่เปิดใช้งาน"
              tone="emerald"
            />
          </div>
        )}
      </section>

      {/* Charts — by year + by category */}
      {data && (
        <section className="mx-auto grid max-w-6xl gap-5 px-6 py-6 lg:grid-cols-2">
          <ByYearChart data={data.stats.by_year} />
          <ByCategoryChart data={data.stats.by_category} />
        </section>
      )}

      {/* Search results — โชว์เฉพาะตอน searching (q ≥ 2 ตัว); แทนที่ open+upcoming */}
      {isSearching && (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <SectionHeader
            title={`ผลค้นหา "${search}"`}
            subtitle={
              searchResults === null
                ? 'กำลังค้น...'
                : searchResults.length === 0
                  ? 'ไม่พบกิจกรรมที่ตรงกับคำค้น'
                  : `พบ ${formatNumber(searchResults.length)} รายการ (จัดเรียงตามความใกล้เคียง)`
            }
          />
          {searchResults === null && <CardSkeletonGrid />}
          {searchResults !== null && searchResults.length === 0 && (
            <EmptyState
              message={`ไม่พบกิจกรรมที่ตรงกับ "${search}" — ลองคำค้นอื่น`}
            />
          )}
          {searchResults !== null && searchResults.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  variant={a.status === 'COMPLETED' ? 'upcoming' : 'open'}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Open + Upcoming — ซ่อนเมื่อ searching เพื่อให้ focus ที่ผลค้นหา */}
      {!isSearching && (
        <>
          <section id="open-activities" className="mx-auto max-w-6xl px-6 py-10">
            <SectionHeader title="กำลังเปิดรับสมัคร" subtitle="สมัครได้ตอนนี้" />
            {!data && !error && <CardSkeletonGrid />}
            {data && data.open.length === 0 && (
              <EmptyState message="ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร" />
            )}
            {data && data.open.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.open.slice(0, 6).map((a) => (
                  <ActivityCard key={a.id} activity={a} variant="open" />
                ))}
              </div>
            )}
          </section>

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
                {data.upcoming.slice(0, 6).map((a) => (
                  <ActivityCard key={a.id} activity={a} variant="upcoming" />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} มหาวิทยาลัยมหาสารคาม — ระบบจัดการกิจกรรมนิสิต
          <div className="text-small">ผู้พัฒนา: ธนศาสตร์ สุดจริง</div>
        </div>
      </footer>
    </main>
  );
}

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'blue' | 'emerald';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-blue-100 text-blue-700';
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-0.5 text-3xl font-bold text-gray-900 md:text-4xl">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

// ─── Charts (CSS-based, no chart library) ─────────────────────

function ByYearChart({
  data,
}: {
  data: LandingStats['by_year'];
}) {
  // scale: ใช้ตัวเลขมากสุดของ (work + completed) ต่อปี เป็น 100%
  const max = Math.max(
    1,
    ...data.map((y) => y.work_count + y.completed_count),
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          กิจกรรมแยกตามปีการศึกษา
        </h3>
        <p className="text-xs text-gray-500">
          นับเฉพาะที่ดำเนินการ + เสร็จสิ้น
        </p>
      </div>
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูลกิจกรรม" />
      ) : (
        <div className="space-y-2.5">
          {data.map((y) => {
            const total = y.work_count + y.completed_count;
            const workPct = (y.work_count / max) * 100;
            const completedPct = (y.completed_count / max) * 100;
            return (
              <div key={y.academic_year} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right font-mono text-xs text-gray-500">
                  {y.academic_year}
                </span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-gray-100">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500"
                    style={{ width: `${workPct}%` }}
                    title={`ดำเนินการ ${y.work_count}`}
                  />
                  <div
                    className="absolute inset-y-0 bg-blue-500"
                    style={{ left: `${workPct}%`, width: `${completedPct}%` }}
                    title={`เสร็จสิ้น ${y.completed_count}`}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                  {formatNumber(total)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-emerald-500" />
          ดำเนินการ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-blue-500" />
          เสร็จสิ้น
        </span>
      </div>
    </div>
  );
}

function ByCategoryChart({
  data,
}: {
  data: LandingStats['by_category'];
}) {
  const total = data.reduce((s, c) => s + c.count, 0);
  const max = Math.max(1, ...data.map((c) => c.count));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          สัดส่วนตามประเภทกิจกรรม
        </h3>
        {total > 0 && (
          <p className="text-xs text-gray-500">
            รวม {formatNumber(total)} กิจกรรม (4 ประเภท)
          </p>
        )}
      </div>
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูลกิจกรรม" />
      ) : (
        <div className="space-y-3">
          {data.map((c, i) => {
            const pct = total > 0 ? (c.count / total) * 100 : 0;
            const barPct = (c.count / max) * 100;
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            return (
              <div key={c.category_id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-gray-700">
                    {c.category_name}
                  </span>
                  <span className="ml-2 shrink-0 tabular-nums text-gray-600">
                    {formatNumber(c.count)}
                    <span className="ml-1 text-gray-400">
                      ({pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
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
