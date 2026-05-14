'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, QrCode, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ActivityForm } from '@/components/faculty/ActivityForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DocumentsSection } from '@/components/faculty/DocumentsSection';
import { GallerySection } from '@/components/faculty/GallerySection';
import { StatusBadge } from '@/components/faculty/StatusBadge';
import {
  formatActivityRange,
  formatDateTime,
  formatNumber,
} from '@/lib/format';
import type { FacultyActivityDetail } from '@/lib/types';

export default function FacultyActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [activity, setActivity] = useState<FacultyActivityDetail | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setActivity(null);
    setError(null);
    api
      .get<FacultyActivityDetail>(`/api/faculty/activities/${id}`)
      .then((res) => {
        if (!cancelled) setActivity(res.data);
      })
      .catch((e) => {
        if (cancelled) return;
        const status = e.response?.status ?? 500;
        const message =
          e.response?.data?.message ||
          (status === 404 ? 'ไม่พบกิจกรรม' : 'โหลดข้อมูลไม่สำเร็จ');
        setError({ status, message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // หลัง mutation document → refresh activity detail (documents + presigned URLs)
  async function refreshActivity() {
    if (!id) return;
    try {
      const res = await api.get<FacultyActivityDetail>(
        `/api/faculty/activities/${id}`,
      );
      setActivity(res.data);
    } catch {
      /* ignore — toast แสดงข้อผิดพลาดผ่าน try ของ component อยู่แล้ว */
    }
  }

  async function handleSave(payload: unknown) {
    if (!id) return;
    setSaving(true);
    try {
      // status DRAFT → endpoint เต็ม / status WORK → endpoint limited (subset เท่านั้น)
      const endpoint =
        activity?.can_edit_limited && !activity?.can_edit
          ? `/api/faculty/activities/${id}/limited`
          : `/api/faculty/activities/${id}`;
      const res = await api.patch<FacultyActivityDetail>(endpoint, payload);
      setActivity(res.data);
      toast.success('บันทึกแล้ว');
    } finally {
      setSaving(false);
    }
  }

  async function executeSubmit() {
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await api.post<FacultyActivityDetail>(
        `/api/faculty/activities/${id}/submit`,
      );
      setActivity(res.data);
      setShowSubmitConfirm(false);
      toast.success('ส่งให้ admin อนุมัติแล้ว');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setShowSubmitConfirm(false);
      toast.error(err.response?.data?.message ?? 'ส่งไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  async function executeComplete() {
    if (!id) return;
    setCompleting(true);
    try {
      const res = await api.post<FacultyActivityDetail>(
        `/api/faculty/activities/${id}/complete`,
      );
      setActivity(res.data);
      setShowCompleteConfirm(false);
      toast.success('ปิดโครงการเรียบร้อย');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setShowCompleteConfirm(false);
      toast.error(err.response?.data?.message ?? 'ปิดโครงการไม่สำเร็จ');
    } finally {
      setCompleting(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        <Link
          href="/dashboard/faculty/activities"
          className="mb-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← กลับรายการกิจกรรม
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-800">
            {error.status === 404 ? 'ไม่พบกิจกรรม' : 'เกิดข้อผิดพลาด'}
          </p>
          <p className="mt-2 text-sm text-rose-700">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        <div className="h-32 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <Link
        href="/dashboard/faculty/activities"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← กลับรายการกิจกรรม
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={activity.status} />
          {activity.is_mine && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              ของฉัน
            </span>
          )}
          {activity.code && (
            <span className="ml-auto font-mono text-xs text-gray-500">
              {activity.code}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{activity.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          จัดโดย {activity.organization_name} · ผู้สร้าง {activity.created_by_name}
        </p>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activity.can_edit && activity.status !== 'PENDING_APPROVAL' && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'กำลังส่ง...' : 'ส่งให้ admin อนุมัติ'}
            </button>
          )}
          {(activity.status === 'WORK' || activity.status === 'COMPLETED') && (
            <>
              <Link
                href={`/dashboard/faculty/activities/${activity.id}/registrations`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <Users className="h-4 w-4" aria-hidden />
                ดูรายชื่อผู้สมัคร
              </Link>
              <Link
                href={`/dashboard/faculty/activities/${activity.id}/check-in`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <QrCode className="h-4 w-4" aria-hidden />
                เปิดหน้าสแกน Check-in
              </Link>
            </>
          )}
          {/* ปิดโครงการ — เฉพาะผู้สร้าง + status WORK */}
          {activity.is_mine && activity.status === 'WORK' && (
            <button
              type="button"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={completing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              ปิดโครงการ
            </button>
          )}
          {!activity.can_edit && !activity.can_edit_limited && activity.is_mine && (
            <p className="text-xs text-gray-500">
              {activity.status === 'PENDING_APPROVAL'
                ? 'รอ admin อนุมัติ — แก้ไขไม่ได้'
                : `สถานะ ${activity.status} — ไม่อนุญาตให้แก้ไข`}
            </p>
          )}
          {activity.can_edit_limited && activity.is_mine && (
            <p className="text-xs text-amber-700">
              กิจกรรมเริ่มดำเนินการแล้ว — แก้ไขได้บางฟิลด์เท่านั้น
            </p>
          )}
          {!activity.is_mine && (
            <p className="text-xs text-gray-500">
              คุณไม่ใช่ผู้สร้าง — ดูได้แต่แก้ไม่ได้
            </p>
          )}
        </div>

        {activity.rejection_reason && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-medium">เหตุผลที่ admin ไม่อนุมัติ:</p>
            <p className="mt-1">{activity.rejection_reason}</p>
          </div>
        )}

      </div>

      {/* Form (full edit / limited edit) หรือ Read-only summary
            DRAFT → can_edit       → mode='edit' (แก้ทุกฟิลด์)
            WORK  → can_edit_limited → mode='edit-limited' (แก้เฉพาะฟิลด์ที่อนุญาต)
            อื่น  → read-only */}
      {activity.can_edit ? (
        <ActivityForm
          mode="edit"
          initial={activity}
          saving={saving}
          onSave={handleSave}
        />
      ) : activity.can_edit_limited ? (
        <ActivityForm
          mode="edit-limited"
          initial={activity}
          saving={saving}
          onSave={handleSave}
        />
      ) : (
        <ReadOnlyView activity={activity} />
      )}

      {/* เอกสารประกอบ — แก้ได้เฉพาะผู้สร้าง + status DRAFT/WORK */}
      <div className="mt-6">
        <DocumentsSection
          activityId={activity.id}
          documents={activity.documents}
          manageable={
            activity.is_mine &&
            (activity.status === 'DRAFT' || activity.status === 'WORK')
          }
          onChanged={refreshActivity}
        />
      </div>

      {/* รูปประกอบกิจกรรม — แสดงเมื่อ status WORK/COMPLETED
          แก้ได้ (เพิ่ม/ลบ) เฉพาะผู้สร้าง + status WORK เท่านั้น */}
      {(activity.status === 'WORK' || activity.status === 'COMPLETED') && (
        <div className="mt-6">
          <GallerySection
            activityId={activity.id}
            manageable={activity.is_mine && activity.status === 'WORK'}
          />
        </div>
      )}

      <ConfirmDialog
        open={showSubmitConfirm}
        title="ส่งกิจกรรมให้ admin อนุมัติ?"
        message={
          <>
            หลังส่งแล้วท่านจะ <strong>แก้ไขไม่ได้</strong>{' '}
            จนกว่า admin จะแจ้งผลอนุมัติ ดำเนินการต่อใช่หรือไม่
          </>
        }
        confirmLabel="ส่งให้อนุมัติ"
        cancelLabel="ยกเลิก"
        loading={submitting}
        onConfirm={executeSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <ConfirmDialog
        open={showCompleteConfirm}
        tone="danger"
        title="ปิดโครงการนี้?"
        message={
          <div className="space-y-2">
            <p>
              เปลี่ยนสถานะ <strong>{activity.title}</strong> เป็น{' '}
              <strong>เสร็จสิ้น (COMPLETED)</strong>
            </p>
            <ul className="ml-4 list-disc text-xs text-gray-600">
              <li>หลังปิดจะ <strong>เพิ่ม/ลบรูปประกอบไม่ได้</strong></li>
              <li>การลงทะเบียน + check-in จะถูกหยุดทันที</li>
              <li>ถ้าต้องเปิดกลับมา ต้องผ่าน super_admin</li>
            </ul>
            {new Date(activity.end_at).getTime() > Date.now() && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                ⚠️ กิจกรรมยังไม่สิ้นสุดตามกำหนด ({formatDateTime(activity.end_at)}) —
                แน่ใจหรือไม่ว่าต้องการปิดก่อนเวลา?
              </p>
            )}
          </div>
        }
        confirmLabel="ปิดโครงการ"
        cancelLabel="ยกเลิก"
        loading={completing}
        onConfirm={executeComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  );
}

// แสดงข้อมูลแบบอ่านอย่างเดียว สำหรับ status ที่ไม่ allow edit
function ReadOnlyView({ activity }: { activity: FacultyActivityDetail }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-gray-900">
          รายละเอียด
        </h2>
        <p className="whitespace-pre-line text-sm text-gray-700">
          {activity.description || '—'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Info label="ประเภท" value={activity.category_name} />
        <Info
          label="ปีการศึกษา / ภาค"
          value={`${activity.academic_year}/${activity.semester}`}
        />
        <Info label="สถานที่" value={activity.location || '—'} />
        <Info label="ชั่วโมงกิจกรรม" value={`${activity.hours} ชั่วโมง`} />
        <Info
          label="ชั่วโมง กยศ"
          value={
            activity.loan_hours > 0
              ? `${activity.loan_hours} ชั่วโมง`
              : 'ไม่นับ'
          }
        />
        <Info
          label="วันเวลาจัด"
          value={formatActivityRange(activity.start_at, activity.end_at)}
        />
        <Info
          label="ความจุ"
          value={`${formatNumber(activity.registered_count)}/${formatNumber(activity.capacity)}`}
        />
        <Info
          label="เปิดรับสมัคร"
          value={`${formatDateTime(activity.registration_open_at)} – ${formatDateTime(
            activity.registration_close_at,
          )}`}
        />
        <Info
          label="โหมดอนุมัติ"
          value={activity.approval_mode === 'AUTO' ? 'อัตโนมัติ' : 'เจ้าหน้าที่อนุมัติ'}
        />
        <Info
          label="แหล่งงบประมาณ"
          value={activity.budget_source || '—'}
        />
        <Info
          label="งบที่ขอใช้"
          value={
            activity.budget_requested != null
              ? `${formatNumber(Number(activity.budget_requested))} บาท`
              : '—'
          }
        />
        <Info
          label="งบที่จ่ายจริง"
          value={
            activity.budget_actual != null
              ? `${formatNumber(Number(activity.budget_actual))} บาท`
              : '—'
          }
        />
      </div>

      {activity.skills.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            ทักษะที่จะได้รับ
          </h2>
          <div className="flex flex-wrap gap-2">
            {activity.skills.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800"
              >
                <span className="font-mono">{s.code}</span> · {s.name}xx
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          คณะที่รับสมัคร
        </h2>
        {activity.eligible_faculties.length === 0 ? (
          <p className="text-sm text-gray-700">เปิดรับทุกคณะ</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activity.eligible_faculties.map((f) => (
              <span
                key={f.id}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
              >
                <span className="font-mono">{f.code}</span> {f.name}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
