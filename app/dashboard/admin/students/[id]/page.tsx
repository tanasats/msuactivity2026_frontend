'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  Gem,
  Mail,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type {
  AdminStudentDetail,
  AdminStudentRegistration,
  EvaluationStatus,
  RegistrationStatus,
} from '@/lib/types';

const REG_STATUS_LABEL: Record<RegistrationStatus, { text: string; tone: string }> = {
  PENDING_APPROVAL: { text: 'รออนุมัติ', tone: 'bg-amber-100 text-amber-800' },
  REGISTERED:       { text: 'ลงทะเบียนแล้ว', tone: 'bg-blue-100 text-blue-800' },
  WAITLISTED:       { text: 'รอคิว', tone: 'bg-gray-100 text-gray-700' },
  CANCELLED_BY_USER:  { text: 'ยกเลิก', tone: 'bg-gray-100 text-gray-600' },
  CANCELLED_BY_STAFF: { text: 'จนท.ยกเลิก', tone: 'bg-gray-100 text-gray-600' },
  REJECTED_BY_STAFF:  { text: 'จนท.ปฏิเสธ', tone: 'bg-rose-100 text-rose-700' },
  ATTENDED:           { text: 'เช็คอินแล้ว', tone: 'bg-emerald-100 text-emerald-800' },
  NO_SHOW:            { text: 'ไม่ได้เข้าร่วม', tone: 'bg-gray-100 text-gray-700' },
};

const EVAL_LABEL: Record<EvaluationStatus, { text: string; tone: string }> = {
  PENDING_EVALUATION: { text: 'รอประเมิน', tone: 'bg-amber-100 text-amber-800' },
  PASSED:             { text: 'ผ่าน', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED:             { text: 'ไม่ผ่าน', tone: 'bg-rose-100 text-rose-800' },
};

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<AdminStudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [evalFilter, setEvalFilter] = useState<EvaluationStatus | 'all'>('all');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    api
      .get<AdminStudentDetail>(`/api/admin/students/${id}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as {
          response?: { status?: number; data?: { message?: string } };
        };
        setError(
          err.response?.status === 404
            ? 'ไม่พบนิสิต'
            : err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.registrations.filter((r) => {
      if (yearFilter !== 'all' && r.academic_year !== yearFilter) return false;
      if (evalFilter !== 'all' && r.evaluation_status !== evalFilter) return false;
      return true;
    });
  }, [data, yearFilter, evalFilter]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <BackLink />
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <BackLink />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  const { user, stats } = data;
  const csvHref = `${
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  }/api/admin/students/${user.id}/registrations.csv`;

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <BackLink />

      {/* Profile header */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {user.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture_url}
              alt={user.full_name}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full border border-gray-200 bg-gray-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-500">
              {user.full_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {user.email}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {user.msu_id && (
                <span className="font-mono">{user.msu_id}</span>
              )}
              {user.faculty_name && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                  {user.faculty_name}
                </span>
              )}
              {user.status !== 'active' && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                  บัญชีถูกปิด
                </span>
              )}
              {user.last_login_at && (
                <span>
                  เข้าใช้ล่าสุด:{' '}
                  {new Date(user.last_login_at).toLocaleDateString('th-TH')}
                </span>
              )}
            </div>
          </div>
          <a
            href={csvHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </a>
        </div>
      </div>

      {/* Aggregate stats */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Trophy className="h-5 w-5" aria-hidden />}
          label="ชั่วโมงกิจกรรม"
          value={formatNumber(stats.overall.hours_total)}
          unit="ชม."
          tone="blue"
        />
        <StatTile
          icon={<Gem className="h-5 w-5" aria-hidden />}
          label="ชั่วโมง กยศ"
          value={formatNumber(stats.overall.loan_hours_total)}
          unit="ชม."
          tone="amber"
        />
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
          label="ผ่านเกณฑ์"
          value={formatNumber(stats.overall.passed_count)}
          unit="ครั้ง"
          tone="emerald"
        />
        <StatTile
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
          label="ลงทะเบียนรวม"
          value={formatNumber(stats.overall.active_count)}
          unit="ครั้ง"
          tone="violet"
          hint={
            stats.overall.failed_count + stats.overall.pending_eval_count > 0
              ? `ไม่ผ่าน ${stats.overall.failed_count} · รอประเมิน ${stats.overall.pending_eval_count}`
              : undefined
          }
        />
      </section>

      {/* By year + by category */}
      {(stats.by_year.length > 0 || stats.by_category.some((c) => c.passed_count > 0)) && (
        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* By year */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              ชั่วโมงต่อปีการศึกษา
            </h3>
            {stats.by_year.length === 0 ? (
              <p className="text-xs text-gray-400">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {stats.by_year.map((y) => {
                  const max = Math.max(1, ...stats.by_year.map((x) => Number(x.hours)));
                  const pct = (Number(y.hours) / max) * 100;
                  return (
                    <div key={y.academic_year} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-right font-mono text-xs text-gray-500">
                        {y.academic_year}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-gray-100">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-gray-700">
                        {formatNumber(Number(y.hours))} ชม.
                        <span className="ml-1 text-gray-400">
                          ({y.passed_count})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By category */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              ชั่วโมงตามหมวด
            </h3>
            <div className="space-y-2">
              {stats.by_category.map((c) => {
                const max = Math.max(
                  1,
                  ...stats.by_category.map((x) => Number(x.hours)),
                );
                const pct = (Number(c.hours) / max) * 100;
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];
                return (
                  <div key={c.category_id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate text-gray-700">{c.category_name}</span>
                      <span className="ml-2 shrink-0 tabular-nums text-gray-600">
                        {formatNumber(Number(c.hours))} ชม.{' '}
                        <span className="text-gray-400">({c.passed_count})</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${colors[(c.category_code - 1) % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Registrations list with filters */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">
            ประวัติการเข้าร่วม{' '}
            <span className="ml-1 text-sm font-normal text-gray-400">
              ({formatNumber(filtered.length)}/{formatNumber(data.registrations.length)})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={String(yearFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setYearFilter(v === 'all' ? 'all' : Number(v));
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <option value="all">ทุกปี</option>
              {stats.by_year.map((y) => (
                <option key={y.academic_year} value={y.academic_year}>
                  ปีการศึกษา {y.academic_year}
                </option>
              ))}
            </select>
            <select
              value={evalFilter}
              onChange={(e) =>
                setEvalFilter(e.target.value as EvaluationStatus | 'all')
              }
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <option value="all">ทุกผลประเมิน</option>
              <option value="PASSED">ผ่าน</option>
              <option value="FAILED">ไม่ผ่าน</option>
              <option value="PENDING_EVALUATION">รอประเมิน</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            {data.registrations.length === 0
              ? 'ยังไม่มีประวัติการเข้าร่วม'
              : 'ไม่มีรายการตรงเงื่อนไข'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">รหัส</th>
                  <th className="px-3 py-3 text-left">กิจกรรม</th>
                  <th className="px-3 py-3 text-left">ปี/ภาค</th>
                  <th className="px-3 py-3 text-left">สถานะ</th>
                  <th className="px-3 py-3 text-left">ผลประเมิน</th>
                  <th className="px-3 py-3 text-right">ชม.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <RegistrationRow key={r.registration_id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/admin/students"
      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      กลับรายการนิสิต
    </Link>
  );
}

function RegistrationRow({ r }: { r: AdminStudentRegistration }) {
  const regLabel = REG_STATUS_LABEL[r.registration_status];
  const evalLabel = r.evaluation_status ? EVAL_LABEL[r.evaluation_status] : null;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-xs text-gray-500">
        {r.activity_code ?? '—'}
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/dashboard/admin/activities/${r.activity_id}`}
          className="font-medium text-gray-900 hover:text-indigo-700"
        >
          {r.activity_title}
        </Link>
        <p className="text-xs text-gray-500">
          {r.category_name} · {r.organization_name}
        </p>
      </td>
      <td className="px-3 py-2 text-xs text-gray-700">
        <Calendar className="mr-1 inline h-3 w-3 text-gray-400" aria-hidden />
        {r.academic_year}/{r.semester}
      </td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${regLabel.tone}`}
        >
          {regLabel.text}
        </span>
      </td>
      <td className="px-3 py-2">
        {evalLabel ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${evalLabel.tone}`}
          >
            {evalLabel.text}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">
        {r.evaluation_status === 'PASSED' ? (
          <>
            <span className="font-semibold text-gray-900">
              {formatNumber(r.hours)}
            </span>
            {r.loan_hours > 0 && (
              <span className="ml-1 text-xs text-amber-700">
                +{formatNumber(r.loan_hours)}กยศ
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

function StatTile({
  icon,
  label,
  value,
  unit,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
  hint?: string;
}) {
  const toneClass = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  }[tone];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">
            {value}
            <span className="ml-1 text-xs font-normal text-gray-500">{unit}</span>
          </p>
          {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

