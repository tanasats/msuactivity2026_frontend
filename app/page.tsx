'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Award,
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Loader2,
  Search,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type {
  ActivitySummary,
  LandingStats,
  PublicActivityListResponse,
  PublicCertRequirement,
  User,
} from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { ActivityCard } from '@/components/ActivityCard';
import {
  CHART_CARD,
  ChartHeader,
  ProportionBar,
  RAINBOW_PALETTE,
} from '@/components/charts/proportion-chart';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ใช้ axios แยก instance — landing page ไม่ต้องการ bearer token / refresh interceptor
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

interface LandingData {
  stats: LandingStats;
  open: ActivitySummary[];
  openTotal: number;       // จำนวนกิจกรรมที่เปิดรับสมัครทั้งหมด (ไม่จำกัด preview)
  upcoming: ActivitySummary[];
  upcomingTotal: number;   // จำนวนกิจกรรมที่กำลังจะเปิดรับสมัครทั้งหมด
  certRule: PublicCertRequirement | null;  // null = ระบบยังไม่ตั้งเกณฑ์ (rare)
}

async function loadLandingData(): Promise<LandingData> {
  const [statsRes, openRes, upcomingRes, certRuleRes] = await Promise.all([
    publicApi.get<LandingStats>('/api/public/landing-stats'),
    publicApi.get<PublicActivityListResponse>('/api/public/activities', {
      params: { filter: 'open', limit: PREVIEW_COUNT },
    }),
    publicApi.get<PublicActivityListResponse>('/api/public/activities', {
      params: { filter: 'upcoming', limit: PREVIEW_COUNT },
    }),
    // cert rule — best-effort (404 ถ้ายังไม่ตั้งเกณฑ์ → section ซ่อนเอง)
    publicApi
      .get<PublicCertRequirement>('/api/public/cert-requirement')
      .catch(() => null),
  ]);
  // ซ่อน duplicate: upcoming ที่อยู่ใน open อยู่แล้ว ไม่ต้องโชว์ซ้ำ
  const openIds = new Set(openRes.data.items.map((a) => a.id));
  const upcomingDeduped = upcomingRes.data.items
    .filter((a) => !openIds.has(a.id))
    .slice(0, PREVIEW_COUNT);
  return {
    stats: statsRes.data,
    open: openRes.data.items,
    openTotal: openRes.data.total,
    upcoming: upcomingDeduped,
    upcomingTotal: upcomingRes.data.total,
    certRule: certRuleRes?.data ?? null,
  };
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LEN = 2;
// จำนวนการ์ด preview ต่อ section บน landing — เกินนี้โชว์ลิงก์ "ดูทั้งหมด" ไปหน้า /activities
const PREVIEW_COUNT = 20;

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
      {/* Hero banner area — background image ชิดบน, ครอบ header + hero section
            - bg-cover + bg-top: image กว้างเต็ม + ชิดบน + crop กลางถ้าจอแคบเกินไป
            - minHeight 300px: รับประกันความสูงขั้นต่ำของพื้นที่ภาพ */}
      <div
        className="w-full bg-cover bg-top bg-no-repeat"
      // style={{
      //   minHeight: '300px',
      //   backgroundImage: "url('/images/activity-bg.png')",
      // }}
      >
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
                <span className="hidden sm:inline-block">กลับไปที่</span> Dashboard
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-4">
            <div className=''>
              <img src="/images/msu-logo-sm.png" className=''></img>
            </div>
            <h1 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              ระบบกิจกรรมนิสิต
              <br className="block" />
              <span className="text-blue-700 text-3xl md:text-4xl">มหาวิทยาลัยมหาสารคาม</span>
            </h1>
          </div>
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
      </div>
      {/* ── จบ hero banner area ── */}

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
              {searchResults.map((a) => {
                // เลือก variant ตามสถานะจริง:
                //   COMPLETED         → 'completed' (badge "เสร็จสิ้น")
                //   WORK + start>now  → 'upcoming'  (badge "กำลังจะมา")
                //   อื่น (กำลังดำเนินการ/เปิดรับสมัคร) → 'open'
                const variant =
                  a.status === 'COMPLETED'
                    ? 'completed'
                    : new Date(a.start_at).getTime() > Date.now()
                      ? 'upcoming'
                      : 'open';
                return <ActivityCard key={a.id} activity={a} variant={variant} />;
              })}
            </div>
          )}
        </section>
      )}

      {/* Open + Upcoming — ซ่อนเมื่อ searching เพื่อให้ focus ที่ผลค้นหา */}
      {!isSearching && (
        <>
          <section id="open-activities" className="mx-auto max-w-6xl px-6 py-10">
            <SectionHeader
              title="กำลังเปิดรับสมัคร"
              subtitle="สมัครได้ตอนนี้"
              count={data?.openTotal}
              viewAllHref="/activities?filter=open"
            />
            {!data && !error && <CardSkeletonGrid />}
            {data && data.open.length === 0 && (
              <EmptyState message="ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร" />
            )}
            {data && data.open.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.open.slice(0, PREVIEW_COUNT).map((a) => (
                  <ActivityCard key={a.id} activity={a} variant="open" />
                ))}
              </div>
            )}
          </section>

          <section className="mx-auto max-w-6xl px-6 py-10">
            <SectionHeader
              title="กิจกรรมที่กำลังจะเปิดรับสมัคร"
              subtitle="ยังไม่เริ่ม / ยังไม่เปิดรับสมัคร"
              count={data?.upcomingTotal}
              viewAllHref="/activities?filter=upcoming"
            />
            {!data && !error && <CardSkeletonGrid />}
            {data && data.upcoming.length === 0 && (
              <EmptyState message="ยังไม่มีกิจกรรมในรายการ" />
            )}
            {data && data.upcoming.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.upcoming.slice(0, PREVIEW_COUNT).map((a) => (
                  <ActivityCard key={a.id} activity={a} variant="upcoming" />
                ))}
              </div>
            )}
          </section>
        </>
      )}



      {/* Transcript criteria — กระตุ้นนิสิตให้รู้เป้าหมาย / ดู progress ตัวเอง
            ซ่อนตอน searching เพื่อให้ focus ผลค้นหา */}
      {!isSearching && data?.certRule && (
        <CertCriteriaSection rule={data.certRule} user={user} />
      )}


      {/* Stats — 2 cards --ซ่อนเมื่อ searching เพื่อให้ focus ที่ผลค้นหา */}
      {!isSearching && (
        <>
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
        </>
      )}

      {/* Open + Upcoming — ซ่อนเมื่อ searching เพื่อให้ focus ที่ผลค้นหา */}
      {!isSearching && (
        <>
          <div className="hidden sm:block">
            {/* Charts — by year / by category / by skill (3 horizontal bars, blue tone) */}
            {data && (
              <section className="mx-auto grid max-w-6xl gap-5 px-6 py-6 lg:grid-cols-3">
                <ByYearChart data={data.stats.by_year} />
                <ByCategoryChart data={data.stats.by_category} />
                <BySkillChart data={data.stats.by_skill} />
              </section>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} มหาวิทยาลัยมหาสารคาม — ระบบกิจกรรมนิสิต v1.0.0-gamma
          <div className="text-small">ผู้พัฒนา: ธนศาสตร์ สุดจริง (tanasat.s@.msu.ac.th)</div>
        </div>
      </footer>
    </main>
  );
}

// ─── Certificate criteria section ─────────────────────────────
//   แสดงเกณฑ์การขอ transcript กิจกรรม บน landing page เพื่อกระตุ้นนิสิตให้รู้เป้าหมาย
//   - guest / non-student → CTA "เข้าสู่ระบบเพื่อตรวจสถานะ"
//   - student logged in   → CTA "ดูสถานะของคุณ" → /dashboard/student/certificates
//   - admin/super_admin   → ไม่มี CTA (เห็นเป็นข้อมูลทั่วไป)
function CertCriteriaSection({
  rule,
  user,
}: {
  rule: PublicCertRequirement;
  user: User | null;
}) {
  const ctaHref =
    user?.role === 'student'
      ? '/dashboard/student/certificates'
      : !user
        ? '/login'
        : null; // admin/faculty — ไม่มี CTA
  const ctaLabel =
    user?.role === 'student'
      ? 'ดูสถานะของคุณ'
      : 'เข้าสู่ระบบเพื่อตรวจสถานะ';

  return (
    // <section className="bg-gradient-to-b from-blue-100 via-slate-50 to-blue-100 py-10 md:py-12">
    <section className="bg-blue-100/50 py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-6 text-center md:mb-8">
          {/* <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 ring-4 ring-amber-50">
            <Award className="h-7 w-7 text-amber-600" aria-hidden />
          </div> */}
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            ทำกิจกรรมครบเกณฑ์ — รับ Transcript กิจกรรม
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            เอกสารแสดงผลการเข้าร่วมกิจกรรมตลอดการศึกษา —
            ใช้ประกอบสมัครงาน ทุนการศึกษา หรือฝึกงาน
          </p>
        </div>

        {/* 3 criteria cards */}
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <CriteriaCard
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            number={rule.group_a_min_activities}
            unit="กิจกรรม"
            title="คณะ / มหาวิทยาลัย"
            hint={`รหัสขึ้นต้นด้วย ${rule.group_a_prefixes.join(', ')}`}
            tone="blue"
          />
          <CriteriaCard
            icon={<UsersRound className="h-5 w-5" aria-hidden />}
            number={rule.group_b_min_activities}
            unit="กิจกรรม"
            title="องค์กรนิสิต"
            hint={`รหัสขึ้นต้นด้วย ${rule.group_b_prefixes.join(', ')}`}
            tone="violet"
          />
          <CriteriaCard
            icon={<Clock className="h-5 w-5" aria-hidden />}
            number={rule.min_total_hours}
            unit="ชั่วโมง"
            title="ชั่วโมงรวมทั้ง 2 กลุ่ม"
            hint="นับเฉพาะกิจกรรมที่ผ่านการประเมิน"
            tone="emerald"
          />
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center">
          {ctaHref && (
            <Link
              href={ctaHref}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 sm:w-auto"
            >
              <Award className="h-4 w-4" aria-hidden />
              {ctaLabel}
            </Link>
          )}
          <Link
            href="#open-activities"
            className="text-sm font-medium text-amber-800 hover:underline"
          >
            ดูกิจกรรมที่เปิดรับสมัคร →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CriteriaCard({
  icon,
  number,
  unit,
  title,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  number: number;
  unit: string;
  title: string;
  hint: string;
  tone: 'blue' | 'violet' | 'emerald';
}) {
  const toneClass = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
        <p className="text-xs font-medium text-gray-500">อย่างน้อย</p>
      </div>
      <p className="text-3xl font-bold leading-none text-gray-900 sm:text-4xl">
        {formatNumber(number)}
        <span className="ml-1.5 text-base font-medium text-gray-500 sm:text-lg">
          {unit}
        </span>
      </p>
      <p className="mt-2 text-sm font-medium text-gray-800">{title}</p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
    </div>
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
//
// Design language (ทุก chart):
//   - palette: rainbow 5 สี — rose / amber / emerald / sky / violet
//       proportion chart (category, skill) ใช้สีตาม index หลัง sort desc
//       stacked chart (year) ใช้ 2 สี: sky (ดำเนินการ) + emerald (เสร็จสิ้น) สื่อ active vs done
//   - track: bg-gray-100 (neutral — ให้สีรุ้งเด่น)
//   - shape: horizontal bar (อ่านง่าย, scan เร็ว, รองรับ label ไทยยาว)
//   - card shell: rounded-2xl + border-gray-200 + p-5 + shadow-sm

// ── ByYearChart — stacked horizontal bar (work + completed) ───────
//   stacked ดีเพราะแสดงทั้ง total และ breakdown ในแถวเดียว
//   ใช้ sky-500 (work = active สีฟ้า) + emerald-500 (completed = done สีเขียว)
//   เลือก 2 สีจาก rainbow palette ที่สื่อความหมายชัด
function ByYearChart({ data }: { data: LandingStats['by_year'] }) {
  const max = Math.max(
    1,
    ...data.map((y) => y.work_count + y.completed_count),
  );

  return (
    <div className={CHART_CARD}>
      <ChartHeader
        title="กิจกรรมแยกตามปีการศึกษา"
        subtitle="นับเฉพาะที่ดำเนินการ + เสร็จสิ้น"
      />
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
                    className="absolute inset-y-0 left-0 bg-sky-500"
                    style={{ width: `${workPct}%` }}
                    title={`ดำเนินการ ${y.work_count}`}
                  />
                  <div
                    className="absolute inset-y-0 bg-emerald-500"
                    style={{ left: `${workPct}%`, width: `${completedPct}%` }}
                    title={`เสร็จสิ้น ${y.completed_count}`}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                  {formatNumber(total)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-sky-500" />
          ดำเนินการ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-emerald-500" />
          เสร็จสิ้น
        </span>
      </div>
    </div>
  );
}

// ── ByCategoryChart — proportion ของ 4 ประเภท ──────────────────
//   เรียง desc — สีจาก rainbow palette ตาม rank (อันดับ 1 = rose, ลงไปเรื่อย ๆ)
function ByCategoryChart({ data }: { data: LandingStats['by_category'] }) {
  const total = data.reduce((s, c) => s + c.count, 0);
  const max = Math.max(1, ...data.map((c) => c.count));
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className={CHART_CARD}>
      <ChartHeader
        title="สัดส่วนตามประเภทกิจกรรม"
        subtitle={total > 0 ? `รวม ${formatNumber(total)} กิจกรรม` : undefined}
      />
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูลกิจกรรม" />
      ) : (
        <div className="space-y-3">
          {sorted.map((c, i) => (
            <ProportionBar
              key={c.category_id}
              label={c.category_name}
              count={c.count}
              total={total}
              max={max}
              colorClass={RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── BySkillChart — proportion ของทักษะที่จะได้รับ (rollup parent) ─
//   1 กิจกรรมอาจมีหลายทักษะ → sum ของ count > activities_count ได้
function BySkillChart({ data }: { data: LandingStats['by_skill'] }) {
  const total = data.reduce((s, c) => s + c.count, 0);
  const max = Math.max(1, ...data.map((c) => c.count));
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className={CHART_CARD}>
      <ChartHeader
        title="สัดส่วนทักษะที่จะได้รับ"
        subtitle={
          total > 0
            ? `รวม ${formatNumber(total)} ทักษะ (1 กิจกรรมอาจมีหลายทักษะ)`
            : undefined
        }
      />
      {data.length === 0 ? (
        <EmptyState message="ยังไม่มีข้อมูลทักษะ" />
      ) : (
        <div className="space-y-3">
          {sorted.map((s, i) => (
            <ProportionBar
              key={s.skill_id}
              label={`${s.skill_code} · ${s.skill_name}`}
              count={s.count}
              total={total}
              max={max}
              colorClass={RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  count,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  count?: number;            // จำนวนทั้งหมด — โชว์เป็น badge ข้างชื่อ
  viewAllHref?: string;      // ปลายทางลิงก์ "ดูทั้งหมด" (โชว์เมื่อ count > PREVIEW_COUNT)
}) {
  const showViewAll =
    viewAllHref !== undefined && count !== undefined && count > PREVIEW_COUNT;
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
              {formatNumber(count)}
            </span>
          )}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {showViewAll && (
        <Link
          href={viewAllHref}
          className="shrink-0 whitespace-nowrap text-sm font-medium text-blue-700 hover:underline"
        >
          ดูทั้งหมด →
        </Link>
      )}
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
