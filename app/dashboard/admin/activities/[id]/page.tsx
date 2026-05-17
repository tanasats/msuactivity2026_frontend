'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  MapPin,
  PencilLine,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ParticipantsPanel } from '@/components/admin/ParticipantsPanel';
import { RichTextContent } from '@/components/RichTextContent';
import { RichTextEditor } from '@/components/RichTextEditor';
import { StatusBadge } from '@/components/faculty/StatusBadge';
import { formatActivityRange, formatNumber } from '@/lib/format';
import { useAuthStore } from '@/lib/store';
import type {
  ActivityAuditEntry,
  ActivityStatus,
  AdminActivityDetail,
  AdminUserSummary,
  UserRole,
} from '@/lib/types';

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
  const [showSetCreator, setShowSetCreator] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
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

  async function executeSetCreator(newCreatorId: number) {
    if (!id) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${id}/creator`, {
        created_by: newCreatorId,
      });
      toast.success('เปลี่ยนผู้สร้างกิจกรรมแล้ว');
      setShowSetCreator(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'เปลี่ยนผู้สร้างไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function executeEdit(payload: Record<string, unknown>) {
    if (!id) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${id}`, payload);
      toast.success('บันทึกแล้ว');
      setShowEdit(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
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
    <div className="mx-auto max-w-full p-6 md:p-8">
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
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <span>{activity.organization_name}</span>
          <span aria-hidden>·</span>
          <span>สร้างโดย {activity.created_by_name}</span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowSetCreator(true)}
              disabled={busy}
              title="super_admin: เปลี่ยนผู้สร้างกิจกรรม"
              className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
            >
              <UserCog className="h-3 w-3" aria-hidden />
              เปลี่ยนผู้สร้าง
            </button>
          )}
        </p>

        {/* action buttons — approve/reject (PENDING) + แก้ไข (any) + ประวัติ (any)
            + super_admin override "เปลี่ยนสถานะ" — เห็นได้ทุกสถานะ */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(isPending || isSuperAdmin) && (
            <>
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
            </>
          )}
          {/* admin/super_admin: แก้ไข + ดูประวัติ — เห็นทุกสถานะ */}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            แก้ไข
          </button>
          <button
            type="button"
            onClick={() => setShowAudit(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <History className="h-4 w-4" aria-hidden />
            ประวัติ
          </button>
        </div>

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

      {/* Participants panel — admin เห็น stats; super_admin จัดการได้ */}
      <div className="mb-5">
        <ParticipantsPanel activityId={activity.id} manageable={isSuperAdmin} />
      </div>

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
          <RichTextContent html={activity.description} />
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

      {/* Set-creator dialog (super_admin only) — โอน ownership */}
      {showSetCreator && (
        <ChangeCreatorDialog
          currentCreatorName={activity.created_by_name}
          currentCreatorId={activity.created_by}
          busy={busy}
          onClose={() => setShowSetCreator(false)}
          onConfirm={(uid) => executeSetCreator(uid)}
        />
      )}

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

      {/* admin edit dialog (subset of fields) */}
      {showEdit && (
        <AdminEditDialog
          activity={activity}
          busy={busy}
          onClose={() => setShowEdit(false)}
          onSave={executeEdit}
        />
      )}

      {/* audit timeline dialog */}
      {showAudit && (
        <AuditDialog
          activityId={activity.id}
          onClose={() => setShowAudit(false)}
        />
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

// ── Change-creator dialog (super_admin only) ────────────────────
//   - search debounced 300ms ผ่าน /api/users
//   - default filter role=faculty_staff (เคสที่พบบ่อยสุด)
//   - role อื่นที่ allow: admin / super_admin (executive/student/staff disabled — backend reject)
const ALLOWED_CREATOR_ROLES: UserRole[] = [
  'faculty_staff',
  'admin',
  'super_admin',
];
const ROLE_LABEL: Record<UserRole, string> = {
  student: 'นิสิต',
  staff: 'บุคลากร',
  faculty_staff: 'เจ้าหน้าที่คณะ',
  executive: 'ผู้บริหาร',
  admin: 'admin',
  super_admin: 'super_admin',
};

function ChangeCreatorDialog({
  currentCreatorName,
  currentCreatorId,
  busy,
  onClose,
  onConfirm,
}: {
  currentCreatorName: string;
  currentCreatorId: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: (newCreatorId: number) => void;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] =
    useState<(typeof ALLOWED_CREATOR_ROLES)[number]>('faculty_staff');
  const [results, setResults] = useState<AdminUserSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // race-guard: เก่าค่าหลัง — ignore
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('role', roleFilter);
    params.set('status', 'active');
    if (search) params.set('q', search);
    api
      .get<{ items: AdminUserSummary[] }>(`/api/users?${params.toString()}`)
      .then((r) => {
        if (my !== seq.current) return;
        setResults(r.data.items);
      })
      .catch(() => {
        if (my !== seq.current) return;
        setResults([]);
      })
      .finally(() => {
        if (my === seq.current) setLoading(false);
      });
  }, [search, roleFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <UserCog className="h-5 w-5 text-violet-600" aria-hidden />
            เปลี่ยนผู้สร้างกิจกรรม (super_admin)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            ปัจจุบัน: <strong>{currentCreatorName}</strong>
          </p>
        </div>

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ค้นหา ชื่อ / อีเมล / รหัสนิสิต"
                className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-9 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              {searchInput !== search && searchInput.length > 0 && (
                <Loader2
                  className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
                  aria-hidden
                />
              )}
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
                  aria-label="ล้าง"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as (typeof ALLOWED_CREATOR_ROLES)[number])
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              aria-label="กรอง role"
            >
              {ALLOWED_CREATOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading && !results && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              กำลังโหลด...
            </p>
          )}
          {results && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              ไม่พบผู้ใช้
            </p>
          )}
          {results && results.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {results.map((u) => {
                const isCurrent = u.id === currentCreatorId;
                const isSelected = u.id === selectedId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => !isCurrent && setSelectedId(u.id)}
                      disabled={isCurrent}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                        isSelected
                          ? 'bg-violet-50 ring-2 ring-violet-300'
                          : isCurrent
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      {u.picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.picture_url}
                          alt=""
                          width={36}
                          height={36}
                          loading="lazy"
                          className="h-9 w-9 shrink-0 rounded-full border border-gray-200 bg-gray-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                          {u.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {u.full_name}
                          </p>
                          {isCurrent && (
                            <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700">
                              ผู้สร้างปัจจุบัน
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {u.email}
                          {u.faculty_name && (
                            <span className="ml-1 text-gray-400">
                              · {u.faculty_name}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => selectedId !== null && onConfirm(selectedId)}
            disabled={busy || selectedId === null}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'โอนผู้สร้าง'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin quick-edit dialog ──────────────────────────────────────
//   field ที่แก้ได้: title, description, location, capacity, hours, loan_hours,
//                    start_at, end_at, registration_open_at, registration_close_at
//   ส่งเฉพาะ field ที่เปลี่ยนจริงไป backend (จะได้ log audit เฉพาะที่ต่างจริง)
function AdminEditDialog({
  activity,
  busy,
  onClose,
  onSave,
}: {
  activity: AdminActivityDetail;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  // robust ต่อข้อมูลผิด: ปี < 1900 / > 2200 หรือ Invalid Date → คืน '' ให้ user กรอกใหม่
  const isoToLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    if (year < 1900 || year > 2200) return '';
    const yyyy = String(year).padStart(4, '0');
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${yyyy}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const localToIso = (l: string) => {
    if (!l) return null;
    const d = new Date(l);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const [v, setV] = useState({
    title: activity.title,
    description: activity.description,
    location: activity.location,
    capacity: activity.capacity,
    hours: activity.hours,
    loan_hours: activity.loan_hours,
    start_at: isoToLocal(activity.start_at),
    end_at: isoToLocal(activity.end_at),
    registration_open_at: isoToLocal(activity.registration_open_at),
    registration_close_at: isoToLocal(activity.registration_close_at),
    // check-in window — nullable; '' = clear/ใช้ default
    check_in_opens_at: isoToLocal(activity.check_in_opens_at),
    check_in_closes_at: isoToLocal(activity.check_in_closes_at),
  });

  // คำนวณ payload ที่จะส่ง (เฉพาะ field ที่ต่างจาก initial)
  function computeChanged() {
    const out: Record<string, unknown> = {};
    if (v.title !== activity.title) out.title = v.title;
    if (v.description !== activity.description) out.description = v.description;
    if (v.location !== activity.location) out.location = v.location;
    if (Number(v.capacity) !== activity.capacity) out.capacity = Number(v.capacity);
    if (Number(v.hours) !== Number(activity.hours)) out.hours = Number(v.hours);
    if (Number(v.loan_hours) !== Number(activity.loan_hours))
      out.loan_hours = Number(v.loan_hours);
    // 4 ฟิลด์แรกเป็น NOT NULL ใน DB → skip ถ้า invalid
    const requiredDates: ('start_at' | 'end_at' | 'registration_open_at' | 'registration_close_at')[] =
      ['start_at', 'end_at', 'registration_open_at', 'registration_close_at'];
    for (const f of requiredDates) {
      const newIso = localToIso(v[f]);
      // skip ถ้า input ว่าง/invalid (กัน backend reject — column NOT NULL)
      // — เคสที่ pre-existing data ผิด (เช่น 0001-01-01) แล้ว user ยังไม่ได้กรอกใหม่
      if (newIso === null) continue;
      if (newIso !== activity[f]) out[f] = newIso;
    }
    // check-in window — nullable; ส่ง null ได้ (= ใช้ default ของระบบ)
    const nullableDates: ('check_in_opens_at' | 'check_in_closes_at')[] = [
      'check_in_opens_at',
      'check_in_closes_at',
    ];
    for (const f of nullableDates) {
      const newIso = localToIso(v[f]);
      if (newIso !== activity[f]) out[f] = newIso;
    }
    return out;
  }

  // ตรวจ field date ที่ activity เก็บไว้ผิด (year ไม่อยู่ในช่วงปกติ) — เตือน user
  const invalidDateFields: string[] = [];
  if (isoToLocal(activity.start_at) === '' && activity.start_at)
    invalidDateFields.push('วันเริ่มกิจกรรม');
  if (isoToLocal(activity.end_at) === '' && activity.end_at)
    invalidDateFields.push('วันสิ้นสุด');
  if (isoToLocal(activity.registration_open_at) === '' && activity.registration_open_at)
    invalidDateFields.push('วันเปิดรับสมัคร');
  if (isoToLocal(activity.registration_close_at) === '' && activity.registration_close_at)
    invalidDateFields.push('วันปิดรับสมัคร');

  const changed = computeChanged();
  const hasChanges = Object.keys(changed).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PencilLine className="h-5 w-5 text-indigo-600" aria-hidden />
            แก้ไขกิจกรรม (admin override)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            แก้ไขได้ทุกสถานะ — ระบบจะบันทึก audit log ของฟิลด์ที่เปลี่ยน
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {invalidDateFields.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              ⚠️ กิจกรรมนี้มีฟิลด์วันที่ผิดปกติ (ค่าเดิมอยู่นอกช่วง 1900–2200):{' '}
              <strong>{invalidDateFields.join(', ')}</strong> — โปรดกรอกค่าใหม่ก่อนบันทึก
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              ชื่อกิจกรรม
            </label>
            <input
              type="text"
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              maxLength={500}
              disabled={busy}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              รายละเอียด
            </label>
            <RichTextEditor
              value={v.description}
              onChange={(html) => setV({ ...v, description: html })}
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              สถานที่
            </label>
            <input
              type="text"
              value={v.location}
              onChange={(e) => setV({ ...v, location: e.target.value })}
              disabled={busy}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                จำนวนที่รับ
              </label>
              <input
                type="number"
                min={1}
                value={v.capacity}
                onChange={(e) =>
                  setV({ ...v, capacity: Number(e.target.value) })
                }
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ชั่วโมง
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={v.hours}
                onChange={(e) => setV({ ...v, hours: Number(e.target.value) })}
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ชม. กยศ
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={v.loan_hours}
                onChange={(e) =>
                  setV({ ...v, loan_hours: Number(e.target.value) })
                }
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                เริ่มกิจกรรม
              </label>
              <input
                type="datetime-local"
                value={v.start_at}
                onChange={(e) => setV({ ...v, start_at: e.target.value })}
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                สิ้นสุดกิจกรรม
              </label>
              <input
                type="datetime-local"
                value={v.end_at}
                onChange={(e) => setV({ ...v, end_at: e.target.value })}
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                เปิดรับสมัคร
              </label>
              <input
                type="datetime-local"
                value={v.registration_open_at}
                onChange={(e) =>
                  setV({ ...v, registration_open_at: e.target.value })
                }
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ปิดรับสมัคร
              </label>
              <input
                type="datetime-local"
                value={v.registration_close_at}
                onChange={(e) =>
                  setV({ ...v, registration_close_at: e.target.value })
                }
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* check-in window — nullable; ปล่อยว่าง = ใช้ default จาก system_settings */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-medium text-gray-700">
                ช่วงเวลา check-in (ไม่บังคับ)
              </span>
              <span className="text-[10px] text-gray-500">
                ปล่อยว่าง = ใช้ default ของระบบ
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <label className="mb-1 block text-[11px] text-gray-600">
                  เปิดให้ check-in
                </label>
                <input
                  type="datetime-local"
                  value={v.check_in_opens_at}
                  onChange={(e) =>
                    setV({ ...v, check_in_opens_at: e.target.value })
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() =>
                    setV({
                      ...v,
                      check_in_opens_at: '',
                      check_in_closes_at: '',
                    })
                  }
                  disabled={
                    busy || (!v.check_in_opens_at && !v.check_in_closes_at)
                  }
                  className="text-xs text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline disabled:opacity-30 disabled:no-underline"
                  title="ล้างเพื่อใช้ default ของระบบ"
                >
                  ล้างทั้ง 2
                </button>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-600">
                  ปิด check-in
                </label>
                <input
                  type="datetime-local"
                  value={v.check_in_closes_at}
                  onChange={(e) =>
                    setV({ ...v, check_in_closes_at: e.target.value })
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
              จะบันทึก {Object.keys(changed).length} ฟิลด์ที่เปลี่ยน:{' '}
              <span className="font-mono">{Object.keys(changed).join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onSave(changed)}
            disabled={busy || !hasChanges}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit timeline dialog ────────────────────────────────────────

const AUDIT_ACTION_LABEL: Record<ActivityAuditEntry['action'], { text: string; tone: string }> = {
  create: { text: 'สร้างกิจกรรม', tone: 'bg-blue-50 text-blue-700' },
  edit: { text: 'แก้ไขกิจกรรม', tone: 'bg-indigo-50 text-indigo-700' },
  edit_limited: { text: 'แก้ไข (โหมดจำกัด)', tone: 'bg-indigo-50 text-indigo-700' },
  submit: { text: 'ส่งอนุมัติ', tone: 'bg-blue-50 text-blue-700' },
  approve: { text: 'อนุมัติ', tone: 'bg-emerald-50 text-emerald-700' },
  reject: { text: 'ไม่อนุมัติ', tone: 'bg-rose-50 text-rose-700' },
  set_status: { text: 'override สถานะ', tone: 'bg-violet-50 text-violet-700' },
  set_creator: { text: 'เปลี่ยนผู้สร้าง', tone: 'bg-violet-50 text-violet-700' },
  complete: { text: 'ปิดโครงการ', tone: 'bg-emerald-50 text-emerald-700' },
  edit_admin: { text: 'admin แก้ไขฟิลด์', tone: 'bg-indigo-50 text-indigo-700' },
  bulk_approve: { text: 'อนุมัติกลุ่ม', tone: 'bg-emerald-50 text-emerald-700' },
  bulk_reject: { text: 'ไม่อนุมัติกลุ่ม', tone: 'bg-rose-50 text-rose-700' },
  approve_registration: { text: 'อนุมัติผู้สมัคร', tone: 'bg-emerald-50 text-emerald-700' },
  cancel_registration: { text: 'ยกเลิกผู้สมัคร', tone: 'bg-amber-50 text-amber-700' },
  evaluate_registration: { text: 'ประเมินผู้สมัคร', tone: 'bg-violet-50 text-violet-700' },
  staff_check_in: { text: 'เจ้าหน้าที่เช็คอินแทน', tone: 'bg-blue-50 text-blue-700' },
  bulk_add_registration: { text: 'เพิ่มผู้สมัครหลายคน', tone: 'bg-blue-50 text-blue-700' },
  bulk_approve_registration: { text: 'อนุมัติผู้สมัครหลายคน', tone: 'bg-emerald-50 text-emerald-700' },
  bulk_evaluate_registration: { text: 'ประเมินหลายคน', tone: 'bg-violet-50 text-violet-700' },
  change_participant_role: { text: 'เปลี่ยนสถานภาพในกิจกรรม', tone: 'bg-amber-50 text-amber-700' },
};

function AuditDialog({
  activityId,
  onClose,
}: {
  activityId: number;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ActivityAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: ActivityAuditEntry[] }>(
        `/api/admin/activities/${activityId}/audit`,
      )
      .then((r) => setItems(r.data.items))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดไม่สำเร็จ');
      });
  }, [activityId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <History className="h-5 w-5 text-gray-600" aria-hidden />
            ประวัติการเปลี่ยนแปลง
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {!items && !error && (
            <p className="text-sm text-gray-500">กำลังโหลด...</p>
          )}
          {items && items.length === 0 && (
            <p className="text-sm text-gray-500">
              ยังไม่มี audit log สำหรับกิจกรรมนี้
            </p>
          )}
          {items && items.length > 0 && (
            <ol className="space-y-3">
              {items.map((l) => {
                const lbl = AUDIT_ACTION_LABEL[l.action] ?? {
                  text: l.action,
                  tone: 'bg-gray-100 text-gray-700',
                };
                return (
                  <li
                    key={l.id}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${lbl.tone}`}
                      >
                        {lbl.text}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(l.created_at).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      โดย <strong>{l.actor_name}</strong>{' '}
                      <span className="text-gray-400">({l.actor_role})</span>
                    </p>
                    {l.note && (
                      <p className="mt-2 rounded bg-gray-50 px-2 py-1 text-xs italic text-gray-700">
                        “{l.note}”
                      </p>
                    )}
                    {(l.before || l.after) && (
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        <DiffBlock label="ก่อน" value={l.before} />
                        <DiffBlock label="หลัง" value={l.after} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {value ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-gray-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <span className="text-xs text-gray-400">—</span>
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
