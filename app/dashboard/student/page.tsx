'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  ListChecks,
  MapPin,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/lib/store';
import {
  formatActivityRange,
  formatNumber,
} from '@/lib/format';
import type {
  EvaluationStatus,
  StudentRegistration,
  StudentStats,
} from '@/lib/types';

// แบ่ง registration เป็น 2 หมวด:
//   active  = PENDING_APPROVAL | REGISTERED  (ยังรอเข้าร่วม)
//   history = ATTENDED | NO_SHOW             (เข้าร่วม/พลาดไปแล้ว)
const ACTIVE_STATUSES = new Set(['PENDING_APPROVAL', 'REGISTERED']);
const HISTORY_STATUSES = new Set(['ATTENDED', 'NO_SHOW']);

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<StudentRegistration[] | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] =
    useState<StudentRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setError(null);
    try {
      const [regsRes, statsRes] = await Promise.all([
        api.get<{ items: StudentRegistration[] }>('/api/student/registrations'),
        api.get<StudentStats>('/api/student/stats'),
      ]);
      setItems(regsRes.data.items);
      setStats(statsRes.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    load();
  }, [user]);

  async function executeCancel() {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      await api.post(
        `/api/student/registrations/${pendingCancel.registration_id}/cancel`,
      );
      setPendingCancel(null);
      toast.success('ยกเลิกการสมัครเรียบร้อย');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setPendingCancel(null);
      toast.error(err.response?.data?.message ?? 'ยกเลิกไม่สำเร็จ');
    } finally {
      setCancelling(false);
    }
  }

  const activeItems = items?.filter((r) =>
    ACTIVE_STATUSES.has(r.registration_status),
  );
  const historyItems = items?.filter((r) =>
    HISTORY_STATUSES.has(r.registration_status),
  );

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">หน้าหลักของฉัน</h1>
      <p className="mb-6 text-sm text-gray-500">
        สรุปการเข้าร่วมกิจกรรม + กิจกรรมที่สมัครไว้และผ่านมาแล้ว
      </p>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={load} className="text-xs underline hover:no-underline">
            ลองใหม่
          </button>
        </div>
      )}

      {/* Stats */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Clock className="h-5 w-5" aria-hidden />}
          label="ชั่วโมงกิจกรรมรวม"
          value={stats ? formatNumber(stats.hours_total) : null}
          unit="ชั่วโมง"
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5" aria-hidden />}
          label="ชั่วโมง กยศ รวม"
          value={stats ? formatNumber(stats.loan_hours_total) : null}
          unit="ชั่วโมง"
          tone="amber"
        />
        <StatCard
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          label="กิจกรรมที่เข้าร่วม"
          value={stats ? formatNumber(stats.activities_count) : null}
          unit="กิจกรรม"
          tone="emerald"
        />
      </section>

      {/* Active section: PENDING + REGISTERED */}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          กิจกรรมที่สมัครไว้
        </h2>
        {!items && !error && <CardListSkeleton />}
        {activeItems && activeItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            <p>ยังไม่มีกิจกรรมที่สมัครไว้</p>
            <Link
              href="/"
              className="mt-2 inline-block text-blue-600 hover:underline"
            >
              เลือกกิจกรรมจากหน้าหลัก →
            </Link>
          </div>
        )}
        {activeItems && activeItems.length > 0 && (
          <div className="space-y-4">
            {activeItems.map((reg) => (
              <ActiveCard
                key={reg.registration_id}
                reg={reg}
                onAskCancel={() => setPendingCancel(reg)}
              />
            ))}
          </div>
        )}
      </section>

      {/* History section: ATTENDED + NO_SHOW */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          ประวัติการเข้าร่วม
        </h2>
        {!items && !error && <CardListSkeleton />}
        {historyItems && historyItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            ยังไม่มีประวัติการเข้าร่วม
          </div>
        )}
        {historyItems && historyItems.length > 0 && (
          <div className="space-y-3">
            {historyItems.map((reg) => (
              <HistoryRow key={reg.registration_id} reg={reg} />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!pendingCancel}
        tone="danger"
        title="ยกเลิกการสมัคร?"
        message={
          pendingCancel && (
            <>
              ยกเลิกการสมัครกิจกรรม <strong>{pendingCancel.title}</strong>{' '}
              ไม่สามารถกู้คืนได้ ถ้าต้องการเข้าร่วมอีกครั้งต้องสมัครใหม่
            </>
          )
        }
        confirmLabel="ยกเลิกการสมัคร"
        loading={cancelling}
        onConfirm={executeCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}

// ── stats card ────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  unit,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  unit: string;
  tone?: 'blue' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-blue-100 text-blue-700';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">
            {value === null ? '–' : value}
            <span className="ml-1 text-xs font-normal text-gray-500">
              {unit}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── active registration card (with QR + cancel) ──────────────────
function ActiveCard({
  reg,
  onAskCancel,
}: {
  reg: StudentRegistration;
  onAskCancel: () => void;
}) {
  const isPending = reg.registration_status === 'PENDING_APPROVAL';
  const canCancel = isPending;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {reg.category_name}
            </span>
            {isPending ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                รออนุมัติ
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                อนุมัติเข้าร่วม
              </span>
            )}
          </div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            {reg.title}
          </h3>
          <p className="text-xs text-gray-500">{reg.organization_name}</p>

          <div className="mt-3 space-y-1.5 text-sm text-gray-700">
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span>{reg.location || '—'}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span>{formatActivityRange(reg.start_at, reg.end_at)}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span>
                {formatNumber(reg.hours)} ชั่วโมง
                {reg.loan_hours > 0 && (
                  <span className="ml-1 text-amber-700">
                    · กยศ {formatNumber(reg.loan_hours)} ชม.
                  </span>
                )}
              </span>
            </div>
          </div>

          {canCancel && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onAskCancel}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                ยกเลิกการสมัคร
              </button>
            </div>
          )}
        </div>

        {/* QR (เฉพาะ REGISTERED แล้วเท่านั้น) */}
        <div className="flex flex-col items-center justify-center md:w-56">
          {reg.qr_token ? (
            <>
              <QRCodeSVG
                value={reg.qr_token}
                size={176}
                marginSize={2}
                level="M"
              />
              <p className="mt-2 text-center font-mono text-[10px] text-gray-400">
                {reg.qr_token.slice(0, 8)}…
              </p>
            </>
          ) : (
            <div className="flex h-44 w-44 flex-col items-center justify-center gap-1 rounded-lg bg-gray-100 p-3 text-center text-xs text-gray-500">
              <span className="text-base">⏳</span>
              <span>QR จะปรากฏ<br />หลังอนุมัติ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ป้ายผลประเมิน (เจ้าหน้าที่คณะให้หลังเช็คอิน)
//   PENDING_EVALUATION → ยังรอเจ้าหน้าที่ประเมิน
//   PASSED            → ผ่าน → นับชั่วโมง
//   FAILED            → ไม่ผ่าน → ไม่นับชั่วโมง (ดู evaluation_note ประกอบ)
const EVALUATION_LABELS: Record<EvaluationStatus, { text: string; tone: string }> = {
  PENDING_EVALUATION: { text: 'รอประเมิน', tone: 'bg-amber-100 text-amber-800' },
  PASSED: { text: 'ผ่าน', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { text: 'ไม่ผ่าน', tone: 'bg-rose-100 text-rose-800' },
};

// ── history row (compact) ────────────────────────────────────────
function HistoryRow({ reg }: { reg: StudentRegistration }) {
  const attended = reg.registration_status === 'ATTENDED';
  const noShow = reg.registration_status === 'NO_SHOW';

  // ป้าย "ผล" — อ้างอิง evaluation_status (ฟีเจอร์ใหม่) แทน attendance_status เก่า
  let resultLabel: { text: string; tone: string };
  if (noShow) {
    resultLabel = { text: 'ไม่ได้เข้าร่วม', tone: 'bg-gray-100 text-gray-700' };
  } else if (reg.evaluation_status) {
    resultLabel = EVALUATION_LABELS[reg.evaluation_status];
  } else {
    // attended แต่ยังไม่มี evaluation_status (rare — ข้อมูลเก่าก่อนระบบประเมิน)
    resultLabel = { text: 'เข้าร่วมแล้ว', tone: 'bg-emerald-100 text-emerald-800' };
  }

  const attendedDate = reg.attended_at
    ? new Date(reg.attended_at).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
            {reg.category_name}
          </span>
          {attended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              เช็คอินแล้ว
              {attendedDate && (
                <span className="text-[10px] font-normal text-emerald-700">
                  · {attendedDate}
                </span>
              )}
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              ไม่ได้เช็คอิน
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultLabel.tone}`}
          >
            ผล: {resultLabel.text}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-gray-900">
          {reg.title}
        </p>
        <p className="text-xs text-gray-500">
          {formatActivityRange(reg.start_at, reg.end_at)} ·{' '}
          {formatNumber(reg.hours)} ชม.
          {reg.loan_hours > 0 &&
            ` · กยศ ${formatNumber(reg.loan_hours)} ชม.`}
        </p>

        {/* หมายเหตุจากเจ้าหน้าที่ — แสดงเมื่อมี (เช่น เหตุผลที่ไม่ผ่าน) */}
        {reg.evaluation_note && (
          <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
            <span className="font-medium text-gray-500">หมายเหตุ:</span>{' '}
            {reg.evaluation_note}
          </p>
        )}
      </div>
    </div>
  );
}

function CardListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
