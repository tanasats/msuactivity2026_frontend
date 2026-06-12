'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatDateTime, formatNumber } from '@/lib/format';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/lib/store';
import type {
  CertificateEligibility,
  CertificateQualifyingActivity,
  CertificateRequest,
  CertificateStatus,
} from '@/lib/types';

const STATUS_LABEL: Record<CertificateStatus, { text: string; tone: string }> = {
  REQUESTED: { text: 'รอตรวจสอบ', tone: 'bg-amber-100 text-amber-800' },
  APPROVED:  { text: 'อนุมัติแล้ว', tone: 'bg-blue-100 text-blue-800' },
  REJECTED:  { text: 'ไม่อนุมัติ', tone: 'bg-rose-100 text-rose-800' },
  ISSUED:    { text: 'ออก transcript แล้ว', tone: 'bg-emerald-100 text-emerald-800' },
};

export default function StudentCertificatesPage() {
  const user = useAuthStore((s) => s.user);

  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [requests, setRequests] = useState<CertificateRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [eligRes, listRes] = await Promise.all([
        api.get<CertificateEligibility>('/api/student/certificates/eligibility'),
        api.get<{ items: CertificateRequest[] }>('/api/student/certificates'),
      ]);
      setEligibility(eligRes.data);
      setRequests(listRes.data.items);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    load();
  }, [user, load]);

  // มี pending request (REQUESTED|APPROVED) → ปุ่มขอ disable ตามฝั่ง backend
  const hasPending = requests?.some(
    (r) => r.status === 'REQUESTED' || r.status === 'APPROVED',
  );
  const canRequest = !!eligibility?.eligible && !hasPending && !submitting;

  async function executeRequest() {
    setSubmitting(true);
    try {
      await api.post('/api/student/certificates/request');
      toast.success('ส่งคำขอ transcript สำเร็จ — รอ admin ตรวจสอบ');
      setShowConfirm(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ส่งคำขอไม่สำเร็จ');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Award className="h-6 w-6 text-blue-600" aria-hidden />
        <h1 className="text-2xl font-bold text-gray-900">
          ขอ Transcript กิจกรรม
        </h1>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={load}
            className="text-xs underline hover:no-underline"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {loading && !eligibility && (
        <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      )}

      {/* Eligibility card */}
      {eligibility && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              สถานะคุณสมบัติของคุณ
            </h2>
            <EligibilityBadge eligible={eligibility.eligible} />
          </div>

          <div className="space-y-3">
            <CheckRow
              met={eligibility.group_a.met}
              label="กิจกรรมคณะ/มหาวิทยาลัย"
              hint={`รหัสกิจกรรมขึ้นต้นด้วย ${eligibility.group_a.prefixes.join(', ')}`}
              actual={eligibility.group_a.actual_count}
              required={eligibility.group_a.required_count}
              unit="กิจกรรม"
            />
            <CheckRow
              met={eligibility.group_b.met}
              label="กิจกรรมองค์กรนิสิต"
              hint={`รหัสกิจกรรมขึ้นต้นด้วย ${eligibility.group_b.prefixes.join(', ')}`}
              actual={eligibility.group_b.actual_count}
              required={eligibility.group_b.required_count}
              unit="กิจกรรม"
            />
            <CheckRow
              met={eligibility.hours.met}
              label="ชั่วโมงรวมของทั้ง 2 กลุ่ม"
              hint="รวมเฉพาะกิจกรรมที่นับเป็นคุณสมบัติ"
              actual={eligibility.hours.actual}
              required={eligibility.hours.required}
              unit="ชั่วโมง"
            />
          </div>

          {/* Action button */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!canRequest}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Award className="h-4 w-4" aria-hidden />
              ขอ Transcript กิจกรรม
            </button>
            {hasPending && (
              <p className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                มีคำขออยู่ระหว่างดำเนินการ — รอให้ admin ตรวจสอบก่อน
              </p>
            )}
            {!eligibility.eligible && !hasPending && (
              <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <Info className="h-3.5 w-3.5" aria-hidden />
                ยังไม่ผ่านเกณฑ์ — โปรดเข้าร่วมกิจกรรมเพิ่มจนครบทั้ง 3 ข้อ
              </p>
            )}
          </div>

          {/* Qualifying activities — expand to see */}
          <QualifyingDetails
            groupA={eligibility.qualifying.group_a}
            groupB={eligibility.qualifying.group_b}
            groupALabel="กิจกรรมคณะ/มหาวิทยาลัย"
            groupBLabel="กิจกรรมองค์กรนิสิต"
          />
        </section>
      )}

      {/* History */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          ประวัติการขอ Transcript
        </h2>
        {requests === null ? (
          <div className="h-20 animate-pulse rounded-lg bg-gray-50" />
        ) : requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            ยังไม่เคยขอ transcript
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">วันที่ขอ</th>
                  <th className="px-3 py-2 text-left">สถานะ</th>
                  <th className="px-3 py-2 text-right">ชั่วโมงตอนขอ</th>
                  <th className="px-3 py-2 text-left">เอกสารเลขที่</th>
                  <th className="px-3 py-2 text-left">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => {
                  const lbl = STATUS_LABEL[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">
                        {formatDateTime(r.requested_at)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${lbl.tone}`}
                        >
                          {lbl.text}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(r.total_hours_at_request)} ชม.
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">
                        {r.document_no ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {r.status === 'REJECTED' && r.rejected_reason ? (
                          <span className="text-rose-700">
                            {r.rejected_reason}
                          </span>
                        ) : r.status === 'ISSUED' && r.issued_at ? (
                          <span>
                            ออกเมื่อ {formatDateTime(r.issued_at)}
                          </span>
                        ) : r.status === 'APPROVED' && r.reviewed_at ? (
                          <span>
                            อนุมัติเมื่อ {formatDateTime(r.reviewed_at)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showConfirm}
        title="ยืนยันขอ Transcript กิจกรรม"
        message={
          <div className="space-y-2">
            <p>
              ระบบจะสร้างคำขอใหม่ — admin จะตรวจสอบและออกเอกสารให้ ไม่สามารถยกเลิกคำขอเองได้
            </p>
            {eligibility && (
              <p className="text-xs text-gray-500">
                สรุปคุณสมบัติ:{' '}
                <strong>{eligibility.group_a.actual_count}</strong> + <strong>
                  {eligibility.group_b.actual_count}
                </strong>{' '}
                กิจกรรม · <strong>{formatNumber(eligibility.hours.actual)}</strong>{' '}
                ชั่วโมง
              </p>
            )}
          </div>
        }
        confirmLabel="ยืนยันส่งคำขอ"
        loading={submitting}
        onConfirm={executeRequest}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function EligibilityBadge({ eligible }: { eligible: boolean }) {
  if (eligible) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        ผ่านเกณฑ์ครบถ้วน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      ยังไม่ผ่านเกณฑ์
    </span>
  );
}

function CheckRow({
  met,
  label,
  hint,
  actual,
  required,
  unit,
}: {
  met: boolean;
  label: string;
  hint: string;
  actual: number;
  required: number;
  unit: string;
}) {
  const ratio = Math.min(actual / required, 1);
  const remaining = Math.max(required - actual, 0);
  return (
    <div
      className={`rounded-xl border p-4 ${
        met ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {met ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <div className="text-right">
          <p
            className={`text-base font-semibold tabular-nums ${
              met ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {formatNumber(actual)}
            <span className="text-xs font-normal text-gray-500"> / {formatNumber(required)}</span>
          </p>
          <p className="text-xs text-gray-500">{unit}</p>
        </div>
      </div>
      {/* progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/60">
        <div
          className={`h-full transition-all ${met ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {!met && (
        <p className="mt-2 text-xs text-amber-700">
          ขาดอีก <strong>{formatNumber(remaining)}</strong> {unit}
        </p>
      )}
    </div>
  );
}

// expand/collapse แสดงรายการกิจกรรมที่นับเป็นคุณสมบัติ
function QualifyingDetails({
  groupA,
  groupB,
  groupALabel,
  groupBLabel,
}: {
  groupA: CertificateQualifyingActivity[];
  groupB: CertificateQualifyingActivity[];
  groupALabel: string;
  groupBLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = groupA.length + groupB.length;
  if (total === 0) return null;

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="-m-1 flex w-full items-center justify-between rounded p-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <span>
          ดูรายการกิจกรรมที่นับเป็นคุณสมบัติ ({total})
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-500" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-4">
          <QualifyingSection title={groupALabel} items={groupA} />
          <QualifyingSection title={groupBLabel} items={groupB} />
        </div>
      )}
    </div>
  );
}

function QualifyingSection({
  title,
  items,
}: {
  title: string;
  items: CertificateQualifyingActivity[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-700">
        {title} <span className="font-normal text-gray-500">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">— ยังไม่มี —</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {items.map((a) => (
            <li key={a.activity_id} className="flex items-baseline gap-2 px-3 py-1.5 text-xs">
              <span className="shrink-0 font-mono text-gray-500">{a.code}</span>
              <span className="flex-1 text-gray-700 line-clamp-1">{a.title}</span>
              <span className="shrink-0 text-gray-500 tabular-nums">
                {formatNumber(a.hours)} ชม.
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
