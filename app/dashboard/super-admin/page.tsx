'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  GraduationCap,
  HourglassIcon,
  Tag,
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

export default function SuperAdminOverviewPage() {
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [orgCounts, setOrgCounts] = useState<{ total: number; active: number } | null>(null);
  const [catCounts, setCatCounts] = useState<{ total: number; active: number } | null>(null);
  const [skillCounts, setSkillCounts] = useState<{ total: number; active: number } | null>(null);
  const [facCounts, setFacCounts] = useState<{ total: number; active: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ดึงพร้อมกัน — public stats + admin stats (ทุกปี = ไม่ส่ง academic_year) + master data counts
        const [pubRes, admRes, orgsRes, catsRes, skillsRes, facsRes] = await Promise.all([
          api.get<PublicStats>('/api/public/stats'),
          api.get<AdminStats>('/api/admin/stats'),
          api.get<{ items: MasterOrganization[] }>('/api/organizations'),
          api.get<{ items: MasterCategory[] }>('/api/categories'),
          api.get<{ items: MasterSkill[] }>('/api/skills'),
          api.get<{ items: MasterFaculty[] }>('/api/faculties'),
        ]);
        if (cancelled) return;
        setPublicStats(pubRes.data);
        setAdminStats(admRes.data);
        const orgs = orgsRes.data.items;
        const cats = catsRes.data.items;
        const skills = skillsRes.data.items;
        const facs = facsRes.data.items;
        setOrgCounts({ total: orgs.length, active: orgs.filter((o) => o.is_active).length });
        setCatCounts({ total: cats.length, active: cats.filter((c) => c.is_active).length });
        setSkillCounts({ total: skills.length, active: skills.filter((s) => s.is_active).length });
        setFacCounts({ total: facs.length, active: facs.filter((f) => f.is_active).length });
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

  const pendingApproval = adminStats?.counts?.PENDING_APPROVAL ?? null;

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
        <p className="mt-1 text-sm text-gray-500">
          สถิติทั่วทั้งระบบ + เข้าถึง master data + งาน admin
        </p>
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
          {publicStats && (
            <span className="ml-1 text-xs font-normal text-gray-400">
              ปีการศึกษา {publicStats.academic_year}
            </span>
          )}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="กิจกรรมในปีนี้"
            value={publicStats?.activities_count ?? null}
            Icon={ClipboardList}
            tone="blue"
          />
          <Tile
            label="การลงทะเบียน"
            value={publicStats?.registrations_count ?? null}
            Icon={CheckCircle2}
            tone="emerald"
          />
          <Tile
            label="สมาชิกในระบบ"
            value={publicStats?.members_count ?? null}
            Icon={Users}
            tone="violet"
          />
          <Tile
            label="รออนุมัติ"
            value={pendingApproval}
            Icon={HourglassIcon}
            tone="amber"
            href={
              pendingApproval && pendingApproval > 0
                ? '/dashboard/admin/activities?status=PENDING_APPROVAL'
                : undefined
            }
          />
        </div>
      </section>

      {/* แถว 2 — กิจกรรมแยกตามสถานะ (ทุกปี รวม) */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          กิจกรรมแยกตามสถานะ (ทุกปีการศึกษา)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="ฉบับร่าง"
            value={adminStats?.counts?.DRAFT ?? null}
            Icon={FileEdit}
            tone="gray"
            href="/dashboard/admin/activities?status=DRAFT"
          />
          <Tile
            label="รออนุมัติ"
            value={adminStats?.counts?.PENDING_APPROVAL ?? null}
            Icon={HourglassIcon}
            tone="amber"
            href="/dashboard/admin/activities?status=PENDING_APPROVAL"
          />
          <Tile
            label="ดำเนินการ"
            value={adminStats?.counts?.WORK ?? null}
            Icon={ClipboardList}
            tone="emerald"
            href="/dashboard/admin/activities?status=WORK"
          />
          <Tile
            label="เสร็จสิ้น"
            value={adminStats?.counts?.COMPLETED ?? null}
            Icon={CheckCircle2}
            tone="slate"
            href="/dashboard/admin/activities?status=COMPLETED"
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
