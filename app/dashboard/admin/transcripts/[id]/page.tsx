'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Loader2, RefreshCw, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { downloadAuthedPost } from '@/lib/download';
import { formatNumber } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { TranscriptData } from '@/lib/types';

const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// 'YYYY-MM-DD' → "07 มิถุนายน 2563" (พ.ศ.)
function formatThaiDate(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${String(d.getUTCDate()).padStart(2, '0')} ${TH_MONTHS[d.getUTCMonth()]} ${
    d.getUTCFullYear() + 543
  }`;
}

// แปลง admission_date จาก backend (อาจมี timestamp) → 'YYYY-MM-DD' สำหรับ input[type=date]
function toDateInput(v: string | null): string {
  if (!v) return '';
  return v.slice(0, 10);
}

interface FormState {
  prefix_en: string;
  name_en: string;
  surname_en: string;
  major_name: string;
  degree_name: string;
  admission_date: string;
}

export default function TranscriptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    api
      .get<TranscriptData>(`/api/admin/students/${id}/transcript`)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        const h = res.data.header;
        setForm({
          prefix_en: h.prefix_en ?? '',
          name_en: h.name_en ?? '',
          surname_en: h.surname_en ?? '',
          major_name: h.major_name ?? '',
          degree_name: h.degree_name ?? '',
          admission_date: toDateInput(h.admission_date),
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { response?: { status?: number; data?: { message?: string } } };
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

  function setField(key: keyof FormState, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!id || !form) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/students/${id}/academic-profile`, {
        prefix_en: form.prefix_en,
        name_en: form.name_en,
        surname_en: form.surname_en,
        major_name: form.major_name,
        degree_name: form.degree_name,
        admission_date: form.admission_date || null,
      });
      toast.success('บันทึกข้อมูลนิสิตแล้ว');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!id || !form) return;
    setDownloading(true);
    // override จากฟอร์ม — ส่งให้ Word ใช้โดยไม่ต้องบันทึกลง DB ก่อน
    const nameEnFull = [form.prefix_en, form.name_en, form.surname_en]
      .filter(Boolean)
      .join(' ');
    await downloadAuthedPost(
      `/api/admin/students/${id}/transcript.docx`,
      {
        major_name: form.major_name,
        degree_name: form.degree_name,
        admission_date: form.admission_date,
        name_en_full: nameEnFull,
      },
      `transcript-${data?.header.msu_id || id}.docx`,
    );
    setDownloading(false);
  }

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

  if (!data || !form) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <BackLink />
        <div className="mt-4 h-96 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  const { header, years, summary } = data;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="ยังไม่เปิดใช้งาน — รอเชื่อม API ระบบทะเบียน"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            ดึงจากระบบทะเบียน
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            บันทึกข้อมูล
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            ดาวน์โหลด Word
          </button>
        </div>
      </div>

      {/* Editable student info form */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">ข้อมูลนิสิต (สำหรับหัวเอกสาร)</h2>
        <p className="mb-3 text-xs text-gray-400">
          ช่องที่ระบบยังไม่มีข้อมูล กรอกได้เองที่นี่ — กด “บันทึกข้อมูล” เพื่อเก็บถาวร หรือใช้เฉพาะตอนสร้าง Word
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReadonlyField label="รหัสประจำตัว" value={header.msu_id ?? '—'} />
          <ReadonlyField label="ชื่อ-นามสกุล (ไทย)" value={header.full_name} />
          <ReadonlyField label="คณะ" value={header.faculty_name ?? '—'} />
          <Field
            label="คำนำหน้า (อังกฤษ)"
            value={form.prefix_en}
            onChange={(v) => setField('prefix_en', v)}
            placeholder="Mr./Ms."
          />
          <Field
            label="ชื่อ (อังกฤษ)"
            value={form.name_en}
            onChange={(v) => setField('name_en', v)}
          />
          <Field
            label="นามสกุล (อังกฤษ)"
            value={form.surname_en}
            onChange={(v) => setField('surname_en', v)}
          />
          <Field
            label="สาขาวิชา/เอก"
            value={form.major_name}
            onChange={(v) => setField('major_name', v)}
          />
          <Field
            label="ปริญญาที่ได้รับ"
            value={form.degree_name}
            onChange={(v) => setField('degree_name', v)}
            placeholder="เช่น ศศ.บ."
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              วันที่รับเข้าศึกษา
            </label>
            <input
              type="date"
              value={form.admission_date}
              onChange={(e) => setField('admission_date', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </section>

      {/* Preview — เหมือนใบระเบียนกิจกรรมนิสิต */}
      <section className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          ตัวอย่างเอกสาร
        </p>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          {/* doc header */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900">มหาวิทยาลัยมหาสารคาม</h3>
            <p className="text-sm text-gray-600">มหาสารคาม ประเทศไทย</p>
            <p className="mt-2 text-base font-bold text-gray-900">ใบระเบียนกิจกรรมนิสิต</p>
          </div>

          {/* student info */}
          <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <InfoLine label="รหัสประจำตัว" value={header.msu_id} />
            <InfoLine label="คณะ" value={header.faculty_name} />
            <InfoLine label="ชื่อ-นามสกุล" value={header.full_name} />
            <InfoLine
              label="สาขาวิชา/เอก"
              value={form.major_name}
            />
            <InfoLine
              label="Name"
              value={[form.prefix_en, form.name_en, form.surname_en].filter(Boolean).join(' ')}
            />
            <InfoLine label="วันที่รับเข้าศึกษา" value={formatThaiDate(form.admission_date || null)} />
            <InfoLine label="ปริญญาที่ได้รับ" value={form.degree_name} />
          </div>

          {/* activities per year */}
          {years.length === 0 ? (
            <p className="mt-6 text-center text-sm italic text-gray-400">
              — ยังไม่มีกิจกรรมที่ผ่านเกณฑ์ —
            </p>
          ) : (
            years.map((y) => (
              <div key={y.academic_year} className="mt-5">
                <p className="mb-1 text-sm font-semibold text-gray-800">
                  ปีการศึกษา {y.academic_year}
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-300">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <Th>รหัสกิจกรรม</Th>
                        <Th className="text-left">กิจกรรม/โครงการ</Th>
                        <Th>จำนวน ชม.</Th>
                        <Th>สถานภาพ</Th>
                        <Th>ทักษะที่ได้</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {y.activities.map((a) => (
                        <tr key={a.activity_id} className="border-t border-gray-200">
                          <Td className="font-mono">{a.code ?? '—'}</Td>
                          <Td className="text-left">{a.title}</Td>
                          <Td>{formatNumber(a.hours)}</Td>
                          <Td>{a.status_letter}</Td>
                          <Td>{a.skills.join(',') || '—'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          {/* org leaders (empty) + summary */}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-800">ผู้นำองค์กรนิสิต</p>
              <div className="overflow-hidden rounded-lg border border-gray-300">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      {data.org_leader_columns.map((c) => (
                        <Th key={c}>{c}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3].map((i) => (
                      <tr key={i} className="border-t border-gray-200">
                        {data.org_leader_columns.map((c) => (
                          <Td key={c}>&nbsp;</Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                * ระบบยังไม่เก็บประวัติผู้นำองค์กร — เว้นว่างให้กรอกใน Word
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-gray-800">สรุปรวม</p>
              <div className="rounded-lg border border-gray-300 p-3 text-sm">
                <p>
                  <span className="font-medium">จำนวนชั่วโมงที่ผ่าน:</span>{' '}
                  {formatNumber(summary.total_hours)} ชม.
                </p>
                <p className="mt-1">
                  <span className="font-medium">ทักษะที่ได้:</span>{' '}
                  {summary.by_skill.map((s) => `${s.code}=${formatNumber(s.hours)}`).join('  ')}
                </p>
                {summary.top_skill && (
                  <p className="mt-1 font-medium text-indigo-700">
                    ทักษะเด่น {summary.top_skill.code} {summary.top_skill.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* legend */}
          <div className="mt-6 grid gap-4 border-t border-gray-200 pt-4 text-[11px] text-gray-600 md:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-700">สถานภาพ</p>
              <p>A: ผู้รับผิดชอบโครงการ</p>
              <p>B: ผู้ดำเนินโครงการ</p>
              <p>C: ผู้เข้าร่วมกิจกรรม</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">ทักษะที่ได้รับการพัฒนา</p>
              {summary.by_skill.map((s) => (
                <p key={s.code}>
                  {s.code}: {s.name}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/admin/transcripts"
      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      กลับรายชื่อครบเกณฑ์
    </Link>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
        {value}
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="flex gap-2">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-gray-900">{value || '—'}</span>
    </p>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border-r border-gray-300 px-2 py-1.5 text-center font-medium last:border-r-0 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-r border-gray-200 px-2 py-1.5 text-center text-gray-800 last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}
