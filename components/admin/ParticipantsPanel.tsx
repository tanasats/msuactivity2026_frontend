'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  QrCode,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatNumber } from '@/lib/format';
import {
  PARTICIPANT_ROLE_LABEL,
  PARTICIPANT_ROLE_ORDER,
} from '@/lib/participant-role';
import type { ParticipantRole } from '@/lib/types';

interface Props {
  activityId: number;
  // manageable = true → โชว์ปุ่ม 3 ปุ่ม + hint (super_admin only)
  //              false → โชว์เฉพาะ stats + link ดูรายชื่อ
  manageable: boolean;
}

type ErrorReason =
  | 'NOT_FOUND'
  | 'NOT_REGISTERED'
  | 'STATUS_MISMATCH'
  | 'NOT_STUDENT'
  | 'ALREADY_REGISTERED'
  | 'FULL'
  | 'NOT_OPEN';

interface ResultRow {
  msu_id?: string;
  registration_id?: number;
}
interface ErrorRow {
  msu_id: string;
  reason: ErrorReason;
  current_status?: string;
}

interface Summary {
  pending: number;
  registered: number;
  attended: number;
  pending_eval: number;   // เช็คอินแล้ว แต่ยังไม่ได้รับการประเมินผล
  passed: number;
  failed: number;
  cancelled: number;      // CANCELLED_BY_USER + CANCELLED_BY_STAFF + REJECTED_BY_STAFF
  total: number;
}

const ERROR_LABEL: Record<ErrorReason, string> = {
  NOT_FOUND: 'ไม่พบรหัสนิสิตในระบบ',
  NOT_STUDENT: 'ไม่ใช่นิสิต',
  NOT_REGISTERED: 'ยังไม่ได้ลงทะเบียนกิจกรรมนี้',
  STATUS_MISMATCH: 'สถานะปัจจุบันไม่อนุญาต',
  ALREADY_REGISTERED: 'ลงทะเบียนกิจกรรมนี้แล้ว',
  FULL: 'กิจกรรมเต็ม',
  NOT_OPEN: 'กิจกรรมยังไม่อยู่ในสถานะที่รับสมัคร',
};

export function ParticipantsPanel({ activityId, manageable }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showEvaluate, setShowEvaluate] = useState(false);
  const [showRole, setShowRole] = useState(false);

  async function loadSummary() {
    try {
      // ใช้ /admin/registrations เพื่อ count ตาม activity_id (มี total filter อยู่แล้ว)
      const params = new URLSearchParams({
        activity_id: String(activityId),
        limit: '1',
      });
      const totalRes = await api.get<{ total: number }>(
        `/api/admin/registrations?${params}`,
      );
      // count per status — ดึง 6 status พร้อมกัน
      const statuses = [
        'PENDING_APPROVAL',
        'REGISTERED',
        'ATTENDED',
        'NO_SHOW',
      ] as const;
      const counts = await Promise.all(
        statuses.map(async (s) => {
          const p = new URLSearchParams({
            activity_id: String(activityId),
            status: s,
            limit: '1',
          });
          const r = await api.get<{ total: number }>(`/api/admin/registrations?${p}`);
          return r.data.total;
        }),
      );
      const [pending, registered, attended, noshow] = counts;
      // count passed/failed/pending_eval via evaluation_status (parallel)
      // cancelled = รวม 3 status ของการยกเลิก (USER + STAFF + REJECTED)
      const cancelStatuses = [
        'CANCELLED_BY_USER',
        'CANCELLED_BY_STAFF',
        'REJECTED_BY_STAFF',
      ] as const;
      const [passedRes, failedRes, pendingEvalRes, ...cancelledArr] =
        await Promise.all([
          api.get<{ total: number }>(
            `/api/admin/registrations?activity_id=${activityId}&evaluation_status=PASSED&limit=1`,
          ),
          api.get<{ total: number }>(
            `/api/admin/registrations?activity_id=${activityId}&evaluation_status=FAILED&limit=1`,
          ),
          api.get<{ total: number }>(
            `/api/admin/registrations?activity_id=${activityId}&evaluation_status=PENDING_EVALUATION&limit=1`,
          ),
          ...cancelStatuses.map((s) =>
            api.get<{ total: number }>(
              `/api/admin/registrations?activity_id=${activityId}&status=${s}&limit=1`,
            ),
          ),
        ]);
      const cancelled = cancelledArr.reduce((sum, r) => sum + r.data.total, 0);
      setSummary({
        pending,
        registered,
        attended: attended + noshow, // attended-ish (รวม no-show)
        pending_eval: pendingEvalRes.data.total,
        passed: passedRes.data.total,
        failed: failedRes.data.total,
        cancelled,
        total: totalRes.data.total,
      });
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Users className="h-5 w-5 text-indigo-600" aria-hidden />
          {manageable ? 'จัดการผู้สมัคร (super_admin override)' : 'ผู้สมัคร'}
        </h2>
        <Link
          href={`/dashboard/admin/registrations?activity_id=${activityId}`}
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          ดูรายชื่อทั้งหมด
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="รออนุมัติ" value={summary.pending} tone="amber" />
          <StatTile label="ลงทะเบียน" value={summary.registered} tone="blue" />
          <StatTile
            label="รอประเมิน"
            value={summary.pending_eval}
            tone="violet"
          />
          <StatTile label="ผ่าน" value={summary.passed} tone="emerald" />
          <StatTile label="ไม่ผ่าน" value={summary.failed} tone="rose" />
          <StatTile label="ยกเลิก" value={summary.cancelled} tone="gray" />
        </div>
      )}

      {/* Actions — super_admin only: เพิ่ม/อนุมัติ/ประเมิน/เปลี่ยนสถานภาพ */}
      {manageable && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            เพิ่มผู้สมัคร
          </button>
          <button
            type="button"
            onClick={() => setShowApprove(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            อนุมัติทีละหลายคน
          </button>
          <button
            type="button"
            onClick={() => setShowCheckIn(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <QrCode className="h-4 w-4" aria-hidden />
            เพิ่มรายชื่อ check-in
          </button>
          <button
            type="button"
            onClick={() => setShowEvaluate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            ประเมินผลทีละหลายคน
          </button>
          <button
            type="button"
            onClick={() => setShowRole(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            <UserCog className="h-4 w-4" aria-hidden />
            เปลี่ยนสถานภาพ
          </button>
        </div>
      )}
      {manageable && (
        <p className="mt-3 text-xs text-gray-500">
          ใส่รหัสนิสิต (11 หลัก) — แยกด้วย <strong>ขึ้นบรรทัดใหม่</strong>,{' '}
          <strong>เว้นวรรค</strong>, หรือ <strong>คอมมา</strong> ก็ได้
        </p>
      )}

      {showAdd && manageable && (
        <BulkMsuIdDialog
          title="เพิ่มผู้สมัคร"
          subtitle="ลงทะเบียนนิสิตเข้ากิจกรรมโดยตรง (REGISTERED ทันที, ข้าม window check)"
          endpoint={`/api/admin/activities/${activityId}/registrations/bulk-add`}
          confirmLabel="เพิ่ม"
          confirmTone="indigo"
          onClose={() => setShowAdd(false)}
          onDone={async () => {
            await loadSummary();
          }}
          successKey="added"
        />
      )}
      {showApprove && manageable && (
        <BulkMsuIdDialog
          title="อนุมัติผู้สมัคร"
          subtitle="ใช้กับนิสิตที่อยู่สถานะ 'รออนุมัติ' — เปลี่ยนเป็น 'ลงทะเบียน' + สร้าง QR"
          endpoint={`/api/admin/activities/${activityId}/registrations/bulk-approve`}
          confirmLabel="อนุมัติ"
          confirmTone="emerald"
          onClose={() => setShowApprove(false)}
          onDone={async () => {
            await loadSummary();
          }}
          successKey="approved"
        />
      )}
      {showCheckIn && manageable && (
        <BulkMsuIdDialog
          title="เพิ่มรายชื่อ check-in"
          subtitle="ใช้กับนิสิตที่อยู่สถานะ 'ลงทะเบียน' — เปลี่ยนเป็น 'เช็คอินแล้ว' + รอประเมิน (กิจกรรมต้องอยู่ใน WORK/COMPLETED)"
          endpoint={`/api/admin/activities/${activityId}/registrations/bulk-check-in`}
          confirmLabel="เช็คอิน"
          confirmTone="blue"
          onClose={() => setShowCheckIn(false)}
          onDone={async () => {
            await loadSummary();
          }}
          successKey="checked_in"
        />
      )}
      {showEvaluate && manageable && (
        <BulkEvaluateDialog
          activityId={activityId}
          onClose={() => setShowEvaluate(false)}
          onDone={async () => {
            await loadSummary();
          }}
        />
      )}
      {showRole && manageable && (
        <BulkRoleDialog
          activityId={activityId}
          onClose={() => setShowRole(false)}
          onDone={async () => {
            await loadSummary();
          }}
        />
      )}
    </section>
  );
}

// ── BulkRoleDialog (เปลี่ยน participant_role) ───────────────────

function BulkRoleDialog({
  activityId,
  onClose,
  onDone,
}: {
  activityId: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [role, setRole] = useState<ParticipantRole>('ORGANIZER');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    successCount: number;
    errors: ErrorRow[];
  } | null>(null);

  const msuIds = useMemo(() => parseMsuIds(input), [input]);

  async function execute() {
    if (msuIds.length === 0) {
      toast.error('กรุณาใส่รหัสนิสิต');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{
        updated: ResultRow[];
        errors?: ErrorRow[];
      }>(
        `/api/admin/activities/${activityId}/registrations/bulk-participant-role`,
        { msu_ids: msuIds, role },
      );
      const successList = res.data.updated ?? [];
      const errs = res.data.errors ?? [];
      setOutcome({ successCount: successList.length, errors: errs });
      if (successList.length > 0) {
        toast.success(
          `เปลี่ยนสถานภาพเป็น "${PARTICIPANT_ROLE_LABEL[role].short}" สำเร็จ ${successList.length} รายการ`,
        );
        await onDone();
      } else if (errs.length > 0) {
        toast.error('ไม่มีรายการที่ดำเนินการสำเร็จ');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="เปลี่ยนสถานภาพผู้เข้าร่วม"
      subtitle="ตั้ง PARTICIPANT / ORGANIZER / LEADER ให้กับนิสิตในกิจกรรมนี้"
      onClose={onClose}
      busy={busy}
    >
      <div className="px-5 py-4">
        <label className="mb-2 block text-xs font-medium text-gray-700">
          สถานภาพใหม่
        </label>
        <div className="flex flex-wrap gap-2">
          {PARTICIPANT_ROLE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              disabled={busy}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                role === r
                  ? 'border-amber-500 bg-amber-100 text-amber-900'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {PARTICIPANT_ROLE_LABEL[r].text}
            </button>
          ))}
        </div>
      </div>

      <MsuIdsTextarea
        value={input}
        onChange={setInput}
        count={msuIds.length}
        disabled={busy}
      />

      {outcome && (
        <ResultPanel
          result={{ successCount: outcome.successCount, errors: outcome.errors }}
        />
      )}

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {outcome ? 'ปิด' : 'ยกเลิก'}
        </button>
        <button
          type="button"
          onClick={execute}
          disabled={busy || msuIds.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? 'กำลังดำเนินการ...' : `บันทึก (${msuIds.length})`}
        </button>
      </div>
    </DialogShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'blue' | 'emerald' | 'rose' | 'violet' | 'gray';
}) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-blue-50 text-blue-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    rose: 'bg-rose-50 text-rose-800',
    violet: 'bg-violet-50 text-violet-800',
    gray: 'bg-gray-100 text-gray-700',
  }[tone];
  return (
    <div className={`rounded-lg px-3 py-2 ${toneClass}`}>
      <p className="text-xs">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

// ── BulkMsuIdDialog (ใช้กับ add + approve) ──────────────────────

interface BulkMsuIdDialogProps {
  title: string;
  subtitle: string;
  endpoint: string;
  confirmLabel: string;
  confirmTone: 'indigo' | 'emerald' | 'blue';
  successKey: 'added' | 'approved' | 'checked_in';
  onClose: () => void;
  onDone: () => Promise<void>;
}

function BulkMsuIdDialog({
  title,
  subtitle,
  endpoint,
  confirmLabel,
  confirmTone,
  successKey,
  onClose,
  onDone,
}: BulkMsuIdDialogProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    errors: ErrorRow[];
  } | null>(null);

  const msuIds = useMemo(() => parseMsuIds(input), [input]);

  async function execute() {
    if (msuIds.length === 0) {
      toast.error('กรุณาใส่รหัสนิสิต');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{
        added?: ResultRow[];
        approved?: ResultRow[];
        checked_in?: ResultRow[];
        errors?: ErrorRow[];
      }>(endpoint, { msu_ids: msuIds });
      const successList = (res.data[successKey] ?? []) as ResultRow[];
      const errs = res.data.errors ?? [];
      setResult({ successCount: successList.length, errors: errs });
      if (successList.length > 0) {
        toast.success(`สำเร็จ ${successList.length} รายการ`);
        await onDone();
      } else if (errs.length > 0) {
        toast.error('ไม่มีรายการที่ดำเนินการสำเร็จ');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const confirmClass = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
  }[confirmTone];

  return (
    <DialogShell title={title} subtitle={subtitle} onClose={onClose} busy={busy}>
      <MsuIdsTextarea
        value={input}
        onChange={setInput}
        count={msuIds.length}
        disabled={busy}
      />

      {result && <ResultPanel result={result} />}

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {result ? 'ปิด' : 'ยกเลิก'}
        </button>
        <button
          type="button"
          onClick={execute}
          disabled={busy || msuIds.length === 0}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? 'กำลังดำเนินการ...' : `${confirmLabel} (${msuIds.length})`}
        </button>
      </div>
    </DialogShell>
  );
}

// ── BulkEvaluateDialog (เพิ่ม result + note) ────────────────────

function BulkEvaluateDialog({
  activityId,
  onClose,
  onDone,
}: {
  activityId: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    successCount: number;
    errors: ErrorRow[];
  } | null>(null);

  const msuIds = useMemo(() => parseMsuIds(input), [input]);

  async function execute() {
    if (msuIds.length === 0) {
      toast.error('กรุณาใส่รหัสนิสิต');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{
        evaluated: ResultRow[];
        errors?: ErrorRow[];
      }>(`/api/admin/activities/${activityId}/registrations/bulk-evaluate`, {
        msu_ids: msuIds,
        result,
        note: note.trim() || undefined,
      });
      const successList = res.data.evaluated ?? [];
      const errs = res.data.errors ?? [];
      setOutcome({ successCount: successList.length, errors: errs });
      if (successList.length > 0) {
        toast.success(`ประเมินสำเร็จ ${successList.length} รายการ`);
        await onDone();
      } else if (errs.length > 0) {
        toast.error('ไม่มีรายการที่ประเมินสำเร็จ');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="ประเมินผลผู้เข้าร่วม"
      subtitle="ใช้กับนิสิตที่อยู่สถานะ 'เช็คอินแล้ว' (ATTENDED) เท่านั้น"
      onClose={onClose}
      busy={busy}
    >
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">ผลประเมิน</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResult('PASSED')}
              disabled={busy}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                result === 'PASSED'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ผ่าน (นับชั่วโมง)
            </button>
            <button
              type="button"
              onClick={() => setResult('FAILED')}
              disabled={busy}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                result === 'FAILED'
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ไม่ผ่าน
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            หมายเหตุ <span className="text-gray-400">(ไม่บังคับ)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            disabled={busy}
            placeholder="เช่น เข้าร่วมครบ, ทำเอกสารไม่ครบ"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <MsuIdsTextarea
        value={input}
        onChange={setInput}
        count={msuIds.length}
        disabled={busy}
      />

      {outcome && (
        <ResultPanel result={{ successCount: outcome.successCount, errors: outcome.errors }} />
      )}

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {outcome ? 'ปิด' : 'ยกเลิก'}
        </button>
        <button
          type="button"
          onClick={execute}
          disabled={busy || msuIds.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? 'กำลังดำเนินการ...' : `บันทึก (${msuIds.length})`}
        </button>
      </div>
    </DialogShell>
  );
}

// ── shared shell / textarea / result panel ──────────────────────

function DialogShell({
  title,
  subtitle,
  onClose,
  busy,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิด"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// แยก msu_ids จาก textarea — รองรับ newline/comma/space
function parseMsuIds(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  ];
}

function MsuIdsTextarea({
  value,
  onChange,
  count,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  count: number;
  disabled: boolean;
}) {
  return (
    <div className="px-5 py-3">
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-medium text-gray-700">
          รหัสนิสิต (msu_id)
        </label>
        <span className="text-xs text-gray-500">
          พบ <strong className="tabular-nums">{count}</strong> รายการ
        </span>
      </div>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={'65010999001\n65010999002, 65010999003\n65010999004'}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <p className="mt-1 text-[11px] text-gray-500">
        แยกด้วยขึ้นบรรทัดใหม่, เว้นวรรค, หรือ comma — ใส่ซ้ำกันก็จะ dedupe อัตโนมัติ
      </p>
    </div>
  );
}

function ResultPanel({
  result,
}: {
  result: { successCount: number; errors: ErrorRow[] };
}) {
  return (
    <div className="space-y-2 border-t border-gray-100 px-5 py-3">
      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
        ✓ สำเร็จ <strong>{result.successCount}</strong> รายการ
      </div>
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-1.5 flex items-center gap-1 font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            ข้ามไป {result.errors.length} รายการ
          </p>
          <ul className="space-y-0.5 text-xs text-amber-900">
            {result.errors.slice(0, 20).map((e, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-mono">{e.msu_id}</span>
                <span>— {ERROR_LABEL[e.reason] ?? e.reason}</span>
                {e.current_status && (
                  <span className="text-amber-700">({e.current_status})</span>
                )}
              </li>
            ))}
            {result.errors.length > 20 && (
              <li className="text-amber-700">
                ... และอีก {result.errors.length - 20} รายการ
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
