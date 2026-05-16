'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Calendar,
  CalendarClock,
  Clock,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityDetail, ActivityStatus } from '@/lib/types';
import {
  formatActivityRange,
  formatDateTime,
  formatNumber,
} from '@/lib/format';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/lib/store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

const STATUS_LABEL: Record<ActivityStatus, { th: string; tone: string }> = {
  DRAFT: { th: 'ฉบับร่าง', tone: 'bg-gray-100 text-gray-700' },
  PENDING_APPROVAL: { th: 'รออนุมัติ', tone: 'bg-amber-100 text-amber-800' },
  WORK: { th: 'ดำเนินการ', tone: 'bg-emerald-100 text-emerald-800' },
  COMPLETED: { th: 'เสร็จสิ้น', tone: 'bg-slate-200 text-slate-800' },
};

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    publicApi
      .get<ActivityDetail>(`/api/public/activities/${id}`)
      .then((res) => setActivity(res.data))
      .catch((e) => {
        const status = e.response?.status ?? 500;
        const message =
          e.response?.data?.message || 'ไม่สามารถโหลดรายละเอียดกิจกรรม';
        setError({ status, message });
      });
  }, [params?.id]);

  function handleApplyClick() {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'student') {
      toast.error('เฉพาะนิสิตเท่านั้นที่สมัครเข้าร่วมกิจกรรมได้');
      return;
    }
    setShowConfirm(true);
  }

  async function executeApply() {
    if (!activity) return;
    setSubmitting(true);
    try {
      await api.post('/api/student/registrations', {
        activity_id: activity.id,
      });
      setShowConfirm(false);
      toast.success('สมัครเรียบร้อย — ตรวจสอบ QR ในหน้าหลักของฉัน');
      setTimeout(() => router.push('/dashboard/student'), 1500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setShowConfirm(false);
      toast.error(err.response?.data?.message ?? 'สมัครไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              M
            </div>
            <span className="font-semibold text-gray-900">MSU Activity</span>
          </Link>
          {/* <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            เข้าสู่ระบบ
          </Link> */}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← กลับหน้าหลัก
        </Link>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-rose-800">
              {error.status === 404 ? 'ไม่พบกิจกรรม' : 'เกิดข้อผิดพลาด'}
            </p>
            <p className="text-sm text-rose-700">{error.message}</p>
          </div>
        )}

        {!activity && !error && (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-white" />
            <div className="h-48 animate-pulse rounded-2xl bg-white" />
          </div>
        )}

        {activity && (
          <article className="space-y-6">
            {/* Poster banner */}
            {activity.poster_url && (
              <div className="overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activity.poster_url}
                  alt={activity.title}
                  className="aspect-video w-full object-cover md:aspect-[21/9]"
                />
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="bg-blue-100 text-blue-800">{activity.category_name}</Badge>
                <Badge tone={STATUS_LABEL[activity.status].tone}>
                  {STATUS_LABEL[activity.status].th}
                </Badge>
                <Badge tone="bg-gray-100 text-gray-700">{activity.hours} ชม.</Badge>
              </div>
              <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
                {activity.title}
              </h1>
              <p className="text-sm text-gray-500">
                จัดโดย {activity.organization_name}
                {activity.code && (
                  <>
                    {' · '}
                    <span className="font-mono">{activity.code}</span>
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                รายละเอียดกิจกรรม
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {activity.description || '—'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard
                label="สถานที่จัด"
                Icon={MapPin}
                value={activity.location || '—'}
              />
              <InfoCard
                label="วันที่จัดกิจกรรม"
                Icon={Calendar}
                value={formatActivityRange(activity.start_at, activity.end_at)}
              />
              <InfoCard
                label="เปิดรับสมัคร"
                Icon={CalendarClock}
                value={`${formatDateTime(activity.registration_open_at)} – ${formatDateTime(
                  activity.registration_close_at,
                )}`}
              />
              <InfoCard
                label="ชั่วโมงกิจกรรม"
                Icon={Clock}
                value={`${activity.hours} ชั่วโมง${
                  activity.loan_hours > 0
                    ? ` · กยศ ${activity.loan_hours} ชั่วโมง`
                    : ''
                }`}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                คณะที่รับสมัคร
              </h2>
              {activity.eligible_faculties.length === 0 ? (
                <p className="text-sm text-gray-700">เปิดรับทุกคณะ / สาขา</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activity.eligible_faculties.map((f) => (
                    <Badge key={f.id} tone="bg-blue-50 text-blue-800">
                      {f.code} — {f.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {activity.skills.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">
                  ทักษะที่จะได้รับ
                </h2>
                <div className="flex flex-wrap gap-2">
                  {activity.skills.map((s) => (
                    <Badge key={s.id} tone="bg-purple-50 text-purple-800">
                      <span className="font-mono">{s.code}</span> · {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activity.documents.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  เอกสารประกอบ
                </h2>
                <ul className="divide-y divide-gray-100">
                  {activity.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center gap-3 py-2 text-sm"
                    >
                      <span className="text-gray-400" aria-hidden>
                        📎
                      </span>
                      <span className="min-w-0 flex-1 truncate text-gray-900">
                        {d.display_name?.trim() || d.filename}
                      </span>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        ดาวน์โหลด
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <CapacityCard
              registered={activity.registered_count}
              capacity={activity.capacity}
            />

            {(() => {
              // ตรวจช่วงรับสมัคร — ปุ่มจะ disable + เปลี่ยน label ตามเหตุผล
              //   not_open = ยังไม่ถึงเวลาเปิดรับสมัคร
              //   closed   = ปิดรับสมัครแล้ว
              //   full     = ที่นั่งเต็ม
              //   open     = ยังรับได้ → กดสมัครได้
              const now = Date.now();
              const opensAt = activity.registration_open_at
                ? new Date(activity.registration_open_at).getTime()
                : null;
              const closesAt = activity.registration_close_at
                ? new Date(activity.registration_close_at).getTime()
                : null;
              const isFull = activity.registered_count >= activity.capacity;
              const notOpenYet = opensAt !== null && now < opensAt;
              const alreadyClosed = closesAt !== null && now > closesAt;

              const blocked = isFull || notOpenYet || alreadyClosed;
              let label: string;
              if (notOpenYet) label = 'ยังไม่เปิดรับสมัคร';
              else if (alreadyClosed) label = 'ปิดรับสมัครแล้ว';
              else if (isFull) label = 'ที่นั่งเต็มแล้ว';
              else if (!isLoggedIn) label = 'เข้าสู่ระบบเพื่อสมัคร';
              else label = 'สมัครเข้าร่วมกิจกรรม';

              return (
                <div className="sticky bottom-4 rounded-2xl bg-white/95 p-4 shadow-md ring-1 ring-gray-200 backdrop-blur md:static md:shadow-none md:ring-0">
                  <button
                    onClick={handleApplyClick}
                    disabled={submitting || blocked}
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {label}
                  </button>
                </div>
              );
            })()}

          </article>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="ยืนยันการสมัครเข้าร่วมกิจกรรม?"
        message={
          activity && (
            <>
              สมัครเข้าร่วม <strong>{activity.title}</strong>{' '}
              {activity.registration_open_at && activity.registration_close_at && (
                <span className="block text-xs text-gray-500">
                  ปิดรับสมัคร: {formatDateTime(activity.registration_close_at)}
                </span>
              )}
            </>
          )
        }
        confirmLabel="สมัครเลย"
        loading={submitting}
        onConfirm={executeApply}
        onCancel={() => setShowConfirm(false)}
      />
    </main>
  );
}

function Badge({
  children,
  tone = 'bg-gray-100 text-gray-700',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

function InfoCard({
  label,
  Icon,
  value,
}: {
  label: string;
  Icon: LucideIcon;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <Icon className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function CapacityCard({
  registered,
  capacity,
}: {
  registered: number;
  capacity: number;
}) {
  const ratio = Math.min(registered / capacity, 1);
  const isFull = registered >= capacity;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">จำนวนผู้สมัคร</h2>
        <span
          className={`text-base font-bold ${isFull ? 'text-rose-700' : 'text-blue-700'}`}
        >
          {formatNumber(registered)} / {formatNumber(capacity)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full ${isFull ? 'bg-rose-500' : 'bg-blue-500'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
