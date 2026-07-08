'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  GraduationCap,
  HourglassIcon,
  Tag,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type {
  AdminStats,
  MasterCategory,
  MasterFaculty,
  MasterOrganization,
  MasterSkill,
  PublicStats,
} from '@/lib/types';

interface AcademicYearsResponse {
  current: number;
  default_year: number;
  available: number[];
}

export default function SuperAdminOverviewPage() {
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [orgCounts, setOrgCounts] = useState<{ total: number; active: number } | null>(null);
  const [catCounts, setCatCounts] = useState<{ total: number; active: number } | null>(null);
  const [skillCounts, setSkillCounts] = useState<{ total: number; active: number } | null>(null);
  const [facCounts, setFacCounts] = useState<{ total: number; active: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // default = "ทุกปีการศึกษา" (null)
  const [academicYear, setAcademicYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // โหลดครั้งเดียว — master data + รายการปี (ไม่ผูกกับปีที่เลือก)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgsRes, catsRes, skillsRes, facsRes, yearsRes] = await Promise.all([
          api.get<{ items: MasterOrganization[] }>('/api/organizations'),
          api.get<{ items: MasterCategory[] }>('/api/categories'),
          api.get<{ items: MasterSkill[] }>('/api/skills'),
          api.get<{ items: MasterFaculty[] }>('/api/faculties'),
          api.get<AcademicYearsResponse>('/api/admin/academic-years'),
        ]);
        if (cancelled) return;
        const orgs = orgsRes.data.items;
        const cats = catsRes.data.items;
        const skills = skillsRes.data.items;
        const facs = facsRes.data.items;
        setOrgCounts({ total: orgs.length, active: orgs.filter((o) => o.is_active).length });
        setCatCounts({ total: cats.length, active: cats.filter((c) => c.is_active).length });
        setSkillCounts({ total: skills.length, active: skills.filter((s) => s.is_active).length });
        setFacCounts({ total: facs.length, active: facs.filter((f) => f.is_active).length });
        setAvailableYears(yearsRes.data.available);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // สถิติที่เปลี่ยนตามปี — public stats + admin stats (null = ทุกปี ไม่ส่ง param)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const yp = academicYear !== null ? `academic_year=${academicYear}` : '';
        const [pubRes, admRes] = await Promise.all([
          api.get<PublicStats>(`/api/public/stats${yp ? `?${yp}` : ''}`),
          api.get<AdminStats>(`/api/admin/stats${yp ? `?${yp}` : ''}`),
        ]);
        if (cancelled) return;
        setPublicStats(pubRes.data);
        setAdminStats(admRes.data);
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
  }, [academicYear]);

  const yearLabel = academicYear !== null ? `ปีการศึกษา ${academicYear}` : 'ทุกปีการศึกษา';
  const yearQuery = `academic_year=${academicYear ?? 'all'}`;

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
          <p className="mt-1 text-sm text-gray-500">
            สถิติทั่วทั้งระบบ + เข้าถึง master data
            <span className="ml-1.5 text-gray-400">· {yearLabel}</span>
          </p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm">
          <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="text-gray-600">ปีการศึกษา</span>
          <select
            value={academicYear ?? 'ALL'}
            onChange={(e) =>
              setAcademicYear(e.target.value === 'ALL' ? null : Number(e.target.value))
            }
            className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
            aria-label="เลือกปีการศึกษา"
          >
            <option value="ALL">ทุกปีการศึกษา</option>
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

      {/* แถว 1 — สถิติเชิงปริมาณของระบบ */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          ระบบโดยรวม{' '}
          <span className="ml-1 text-xs font-normal text-gray-400">{yearLabel}</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="กิจกรรม"
            value={publicStats?.activities_count ?? null}
            Icon={ClipboardList}
            tone="blue"
          />
          <Tile
            label="การลงทะเบียน (ครั้ง)"
            value={publicStats?.registrations_count ?? null}
            Icon={CheckCircle2}
            tone="emerald"
          />
          <Tile
            label="นิสิตที่เข้าร่วม (คน)"
            value={publicStats?.participants_count ?? null}
            Icon={UserCheck}
            tone="amber"
          />
          <Tile
            label="สมาชิกในระบบ (ทั้งหมด)"
            value={publicStats?.members_count ?? null}
            Icon={Users}
            tone="violet"
          />
        </div>
      </section>

      {/* แถว 2 — กิจกรรมแยกตามสถานะ (ทุกปี รวม) */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          กิจกรรมแยกตามสถานะ{' '}
          <span className="ml-1 text-xs font-normal text-gray-400">{yearLabel}</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="ฉบับร่าง"
            value={adminStats?.counts?.DRAFT ?? null}
            Icon={FileEdit}
            tone="gray"
            href={`/dashboard/admin/activities?status=DRAFT&${yearQuery}`}
          />
          <Tile
            label="รออนุมัติ"
            value={adminStats?.counts?.PENDING_APPROVAL ?? null}
            Icon={HourglassIcon}
            tone="amber"
            href={`/dashboard/admin/activities?status=PENDING_APPROVAL&${yearQuery}`}
          />
          <Tile
            label="ดำเนินการ"
            value={adminStats?.counts?.WORK ?? null}
            Icon={ClipboardList}
            tone="emerald"
            href={`/dashboard/admin/activities?status=WORK&${yearQuery}`}
          />
          <Tile
            label="เสร็จสิ้น"
            value={adminStats?.counts?.COMPLETED ?? null}
            Icon={CheckCircle2}
            tone="slate"
            href={`/dashboard/admin/activities?status=COMPLETED&${yearQuery}`}
          />
        </div>
      </section>

      {/* แถว 3 — Master data shortcuts */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Master data</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MasterDataCard
            label="คณะ/หน่วยงาน"
            counts={facCounts}
            href="/dashboard/super-admin/faculties"
            Icon={GraduationCap}
          />
          <MasterDataCard
            label="องค์กรจัดกิจกรรม"
            counts={orgCounts}
            href="/dashboard/super-admin/organizations"
            Icon={Building2}
          />
          <MasterDataCard
            label="ประเภทกิจกรรม"
            counts={catCounts}
            href="/dashboard/super-admin/categories"
            Icon={Tag}
          />
          <MasterDataCard
            label="ทักษะ"
            counts={skillCounts}
            href="/dashboard/super-admin/skills"
            Icon={Wrench}
          />
        </div>
      </section>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
  amber: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  slate: 'bg-slate-200 text-slate-700',
};

function Tile({
  label,
  value,
  Icon,
  tone,
  href,
}: {
  label: string;
  value: number | null;
  Icon: LucideIcon;
  tone: keyof typeof TONE_CLASS;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASS[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900">
          {value === null ? '–' : formatNumber(value)}
        </p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function MasterDataCard({
  label,
  counts,
  href,
  Icon,
}: {
  label: string;
  counts: { total: number; active: number } | null;
  href: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
      </div>
      {counts ? (
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatNumber(counts.total)}
          </span>
          <span className="text-xs text-gray-500">
            (ใช้งาน {formatNumber(counts.active)})
          </span>
        </div>
      ) : (
        <span className="text-3xl font-bold text-gray-300">–</span>
      )}
      <p className="mt-2 text-xs text-violet-600">จัดการ →</p>
    </Link>
  );
}
