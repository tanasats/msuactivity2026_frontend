'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/faculty/StatusBadge';
import { formatActivityRange, formatNumber } from '@/lib/format';
import { useAuthStore } from '@/lib/store';
import type { ActivityStatus, AdminActivityDetail } from '@/lib/types';

const STATUS_LABEL: Record<ActivityStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  PENDING_APPROVAL: 'รออนุมัติ',
  WORK: 'ดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
};

export default function AdminActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'super_admin');

  const [activity, setActivity] = useState<AdminActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showSetStatus, setShowSetStatus] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ActivityStatus>('DRAFT');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const res = await api.get<AdminActivityDetail>(
        `/api/admin/activities/${id}`,
      );
      setActivity(res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function executeApprove() {
    if (!id) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${id}/approve`);
      toast.success('อนุมัติกิจกรรมแล้ว');
      setShowApprove(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'อนุมัติไม่สำเร็จ');
      setShowApprove(false);
    } finally {
      setBusy(false);
    }
  }

  async function executeSetStatus() {
    if (!id) return;
    if (targetStatus === activity?.status) {
      setShowSetStatus(false);
      return;
    }
    setBusy(true);
    try {
      const res = await api.patch<{ code_assigned?: boolean }>(
        `/api/admin/activities/${id}/status`,
        { status: targetStatus },
      );
      toast.success(
        res.data?.code_assigned
          ? `เปลี่ยนสถานะเป็น "${STATUS_LABEL[targetStatus]}" + สร้างรหัสกิจกรรมแล้ว`
          : `เปลี่ยนสถานะเป็น "${STATUS_LABEL[targetStatus]}" แล้ว`,
      );
      setShowSetStatus(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function executeReject() {
    if (!id) return;
    if (!rejectReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการไม่อนุมัติ');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('ปฏิเสธกิจกรรมแล้ว — ส่งกลับให้คณะแก้ไข');
      setShowReject(false);
      setRejectReason('');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ปฏิเสธไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <Link
          href="/dashboard/admin/activities"
          className="mb-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← กลับรายการกิจกรรม
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <div className="h-96 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  const isPending = activity.status === 'PENDING_APPROVAL';

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <Link
        href="/dashboard/admin/activities"
        className="mb-4 inline-block text-sm text-indigo-600 hover:underline"
      >
        ← กลับรายการกิจกรรม
      </Link>

      {/* Header card */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={activity.status} />
          {activity.faculty_name && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {activity.faculty_name}
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {activity.category_name}
          </span>
          {activity.code && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs text-gray-600">
              {activity.code}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            ปีการศึกษา {activity.academic_year}/{activity.semester}
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-gray-900 md:text-2xl">
          {activity.title}
        </h1>
        <p className="text-sm text-gray-500">
          {activity.organization_name} · สร้างโดย {activity.created_by_name}
        </p>

        {/* approve/reject buttons — เฉพาะ PENDING_APPROVAL
            + super_admin override "เปลี่ยนสถานะ" — เห็นได้ทุกสถานะ */}
        {(isPending || isSuperAdmin) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => setShowApprove(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  ไม่อนุมัติ
                </button>
              </>
            )}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTargetStatus(activity.status);
                  setShowSetStatus(true);
                }}
                disabled={busy}
                title="super_admin: ข้าม state machine เปลี่ยนสถานะตรง"
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                เปลี่ยนสถานะ (override)
              </button>
            )}
          </div>
        )}

        {/* approval audit trail */}
        {activity.approved_at && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            อนุมัติแล้วเมื่อ{' '}
            {new Date(activity.approved_at).toLocaleString('th-TH')}
            {activity.approved_by_name && <> โดย {activity.approved_by_name}</>}
          </p>
        )}

        {activity.rejection_reason && activity.status === 'DRAFT' && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs">
            <p className="font-medium text-rose-800">เหตุผลที่เคยไม่อนุมัติ:</p>
            <p className="mt-1 text-rose-700">{activity.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Poster */}
      {activity.poster_url && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activity.poster_url}
            alt={activity.title}
            className="h-auto w-full"
          />
        </div>
      )}

      {/* Quick facts */}
      <div className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <Fact
          icon={<MapPin className="h-4 w-4" />}
          label="สถานที่"
          value={activity.location || '—'}
        />
        <Fact
          icon={<Calendar className="h-4 w-4" />}
          label="วันเวลา"
          value={formatActivityRange(activity.start_at, activity.end_at)}
        />
        <Fact
          icon={<Calendar className="h-4 w-4" />}
          label="ช่วงรับสมัคร"
          value={formatActivityRange(
            activity.registration_open_at,
            activity.registration_close_at,
          )}
        />
        <Fact
          icon={<Clock className="h-4 w-4" />}
          label="ชั่วโมง"
          value={
            <>
              {formatNumber(activity.hours)} ชม.
              {activity.loan_hours > 0 && (
                <span className="ml-1 text-amber-700">
                  · กยศ {formatNumber(activity.loan_hours)} ชม.
                </span>
              )}
            </>
          }
        />
        <Fact
          icon={<Users className="h-4 w-4" />}
          label="ที่นั่ง"
          value={`${formatNumber(activity.registered_count)}/${formatNumber(activity.capacity)}`}
        />
        <Fact
          icon={<FileText className="h-4 w-4" />}
          label="โหมดอนุมัติผู้สมัคร"
          value={activity.approval_mode === 'AUTO' ? 'อัตโนมัติ' : 'รออนุมัติ'}
        />
      </div>

      {/* Description */}
      {activity.description && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            รายละเอียดกิจกรรม
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {activity.description}
          </p>
        </div>
      )}

      {/* Skills */}
      {activity.skills.length > 0 && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            ทักษะที่จะได้รับ
          </h2>
          <div className="flex flex-wrap gap-2">
            {activity.skills.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-800"
              >
                <span className="font-mono text-blue-600">{s.code}</span> · {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Eligible faculties */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          คณะที่รับสมัคร
        </h2>
        {activity.eligible_faculties.length === 0 ? (
          <p className="text-xs text-gray-500">ทุกคณะ (ไม่จำกัด)</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activity.eligible_faculties.map((f) => (
              <span
                key={f.id}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
              >
                {f.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">งบประมาณ</h2>
        <dl className="grid gap-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">แหล่งงบประมาณ</dt>
            <dd className="text-gray-900">{activity.budget_source ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">ขอใช้ (บาท)</dt>
            <dd className="text-gray-900">
              {activity.budget_requested !== null
                ? formatNumber(activity.budget_requested)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">จ่ายจริง (บาท)</dt>
            <dd className="text-gray-900">
              {activity.budget_actual !== null
                ? formatNumber(activity.budget_actual)
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Documents */}
      {activity.documents.length > 0 && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            เอกสารประกอบ
          </h2>
          <ul className="space-y-1">
            {activity.documents.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  {d.display_name ?? d.filename}
                </a>
                {!d.is_public && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    ภายใน
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={showApprove}
        title="อนุมัติกิจกรรมนี้?"
        message={
          <>
            อนุมัติให้ <strong>{activity.title}</strong> เริ่มดำเนินการได้ —
            สถานะจะเปลี่ยนจาก "รออนุมัติ" → "ดำเนินการ" และเปิดให้นิสิตสมัครได้
          </>
        }
        confirmLabel="อนุมัติ"
        loading={busy}
        onConfirm={executeApprove}
        onCancel={() => setShowApprove(false)}
      />

      {/* Set-status dialog (super_admin only) — เปลี่ยนสถานะแบบ override state machine */}
      {showSetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <ShieldCheck className="h-5 w-5 text-violet-600" aria-hidden />
                เปลี่ยนสถานะกิจกรรม (super_admin)
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                บังคับเปลี่ยนสถานะข้าม state machine — ใช้กรณี recovery / แก้ผิด
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  สถานะปัจจุบัน
                </label>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900">
                  {STATUS_LABEL[activity.status]}
                </div>
              </div>
              <div>
                <label
                  htmlFor="target-status"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  เปลี่ยนเป็น <span className="text-rose-600">*</span>
                </label>
                <select
                  id="target-status"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ActivityStatus)}
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {(Object.keys(STATUS_LABEL) as ActivityStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]} {s === activity.status ? '(ปัจจุบัน)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {(targetStatus === 'WORK' || targetStatus === 'COMPLETED') &&
                !activity.code && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    กิจกรรมนี้ยังไม่มี code — ระบบจะสร้าง code ใหม่ให้อัตโนมัติ
                  </div>
                )}
              {targetStatus === 'DRAFT' && activity.status !== 'DRAFT' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ส่งกลับเป็นฉบับร่าง — คณะจะแก้ไขแล้ว resubmit ได้ใหม่
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowSetStatus(false)}
                disabled={busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeSetStatus}
                disabled={busy || targetStatus === activity.status}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject dialog — ใส่เหตุผลก่อน confirm */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                ไม่อนุมัติกิจกรรม?
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                ระบุเหตุผลให้คณะนำไปแก้ไข — สถานะจะเปลี่ยนกลับเป็น "ฉบับร่าง"
              </p>
            </div>
            <div className="px-5 py-4">
              <label
                htmlFor="reject-reason"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                เหตุผล <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={busy}
                maxLength={1000}
                placeholder="เช่น โปสเตอร์ไม่ชัด, ข้อมูลกิจกรรมยังไม่ครบ, งบประมาณเกินกำหนด"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {rejectReason.length}/1000
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setShowReject(false);
                  setRejectReason('');
                }}
                disabled={busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeReject}
                disabled={busy || !rejectReason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'กำลังบันทึก...' : 'ส่งคืนให้แก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}
