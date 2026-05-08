'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ImagePlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ActivityPoster, FacultyActivityDetail } from '@/lib/types';

interface PosterMeta {
  storage_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
}

const POSTER_MAX_BYTES = 5 * 1024 * 1024;
const POSTER_ACCEPT = 'image/jpeg,image/png,image/webp';

export interface ActivityFormValue {
  title: string;
  description: string;
  location: string;
  organization_id: number | null;
  category_id: number | null;
  academic_year: number;
  semester: number;
  hours: number;
  loan_hours: number;
  capacity: number;
  start_at: string; // datetime-local format "yyyy-MM-ddTHH:mm"
  end_at: string;
  registration_open_at: string;
  registration_close_at: string;
  approval_mode: 'AUTO' | 'MANUAL';
  skill_ids: number[];
  eligible_faculty_ids: number[];
  check_in_opens_at: string;
  check_in_closes_at: string;
  // budget — string รักษา input ดิบของผู้ใช้ (รวม empty)
  budget_source: string;
  budget_requested: string;
  budget_actual: string;
}

interface RefData {
  organizations: { id: number; code: string; name: string }[];
  categories: { id: number; code: number; name: string }[];
  skills: { id: number; code: string; name: string }[];
  faculties: { id: number; code: string; name: string }[];
}

interface Props {
  // create        = สร้างใหม่ทุกฟิลด์
  // edit          = แก้ทุกฟิลด์ (DRAFT)
  // edit-limited  = แก้เฉพาะ capacity/description/location/dates/eligibles (WORK)
  mode: 'create' | 'edit' | 'edit-limited';
  initial?: FacultyActivityDetail | null;
  saving: boolean;
  onSave: (payload: unknown) => Promise<void>;
}

// helpers ─────────────────────────────────────────────────────────
function getCurrentAcademicYearBE(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const yearAD = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return yearAD + 543;
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function initialPosterMeta(p: ActivityPoster | null): PosterMeta | null {
  if (!p) return null;
  return {
    storage_key: p.storage_key,
    filename: p.filename,
    mime_type: p.mime_type,
    size_bytes: p.size_bytes,
  };
}

function buildInitialValue(initial: FacultyActivityDetail | null | undefined): ActivityFormValue {
  if (!initial) {
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() + 14);
    startDefault.setHours(9, 0, 0, 0);
    const endDefault = new Date(startDefault);
    endDefault.setHours(12, 0, 0, 0);
    const regCloseDefault = new Date(startDefault);
    regCloseDefault.setDate(regCloseDefault.getDate() - 1);
    return {
      title: '',
      description: '',
      location: '',
      organization_id: null,
      category_id: null,
      academic_year: getCurrentAcademicYearBE(),
      semester: 2,
      hours: 1,
      loan_hours: 0,
      capacity: 1,
      start_at: isoToLocalInput(startDefault.toISOString()),
      end_at: isoToLocalInput(endDefault.toISOString()),
      registration_open_at: isoToLocalInput(new Date().toISOString()),
      registration_close_at: isoToLocalInput(regCloseDefault.toISOString()),
      approval_mode: 'AUTO',
      skill_ids: [],
      eligible_faculty_ids: [],
      check_in_opens_at: '',
      check_in_closes_at: '',
      budget_source: '',
      budget_requested: '',
      budget_actual: '',
    };
  }
  return {
    title: initial.title,
    description: initial.description,
    location: initial.location,
    organization_id: initial.organization_id,
    category_id: initial.category_id,
    academic_year: initial.academic_year,
    semester: initial.semester,
    hours: initial.hours,
    loan_hours: initial.loan_hours,
    capacity: initial.capacity,
    start_at: isoToLocalInput(initial.start_at),
    end_at: isoToLocalInput(initial.end_at),
    registration_open_at: isoToLocalInput(initial.registration_open_at),
    registration_close_at: isoToLocalInput(initial.registration_close_at),
    approval_mode: initial.approval_mode,
    skill_ids: initial.skills.map((s) => s.id),
    eligible_faculty_ids: initial.eligible_faculties.map((f) => f.id),
    check_in_opens_at: isoToLocalInput(initial.check_in_opens_at),
    check_in_closes_at: isoToLocalInput(initial.check_in_closes_at),
    budget_source: initial.budget_source ?? '',
    budget_requested:
      initial.budget_requested != null ? String(initial.budget_requested) : '',
    budget_actual:
      initial.budget_actual != null ? String(initial.budget_actual) : '',
  };
}

// component ──────────────────────────────────────────────────────
export function ActivityForm({ mode, initial, saving, onSave }: Props) {
  const [refs, setRefs] = useState<RefData | null>(null);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [value, setValue] = useState<ActivityFormValue>(() =>
    buildInitialValue(initial ?? null),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // poster state — แยกจาก ActivityFormValue เพราะ upload เกิดก่อน save (ไม่อยู่ใน controlled fields)
  const [poster, setPoster] = useState<PosterMeta | null>(
    initialPosterMeta(initial?.poster ?? null),
  );
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(
    initial?.poster_url ?? null,
  );
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // เก็บ object URL ของ local preview เพื่อ revoke ตอน unmount/replace
  const localObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) URL.revokeObjectURL(localObjectUrlRef.current);
    };
  }, []);

  // โหลด dropdown options ครั้งเดียว
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ทุก endpoint require auth — ใช้ api (มี bearer token)
        // skills/orgs/categories ใช้ public api ไม่ได้เพราะยัง require auth ตาม master data CRUD
        const [orgsRes, catsRes, skillsRes, facsRes] = await Promise.all([
          api.get<{ items: RefData['organizations'] }>(
            '/api/organizations?is_active=true',
          ),
          api.get<{ items: RefData['categories'] }>(
            '/api/categories?is_active=true',
          ),
          api.get<{ items: RefData['skills'] }>('/api/skills?is_active=true'),
          api.get<{ items: RefData['faculties'] }>(
            '/api/faculties?is_active=true&category=A',
          ),
        ]);
        if (cancelled) return;
        setRefs({
          organizations: orgsRes.data.items,
          categories: catsRes.data.items,
          skills: skillsRes.data.items,
          faculties: facsRes.data.items,
        });
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setRefsError('โหลดข้อมูล dropdown ไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof ActivityFormValue>(
    key: K,
    val: ActivityFormValue[K],
  ) {
    setValue((v) => ({ ...v, [key]: val }));
  }

  async function handlePosterFile(file: File) {
    setPosterError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPosterError('ไฟล์ต้องเป็น JPG, PNG หรือ WebP');
      return;
    }
    if (file.size > POSTER_MAX_BYTES) {
      setPosterError(`ขนาดไฟล์ต้องไม่เกิน ${POSTER_MAX_BYTES / 1024 / 1024} MB`);
      return;
    }

    // local preview ทันที (ก่อน upload)
    if (localObjectUrlRef.current) URL.revokeObjectURL(localObjectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    localObjectUrlRef.current = localUrl;
    setPosterPreviewUrl(localUrl);

    setPosterUploading(true);
    try {
      const fd = new FormData();
      fd.append('poster', file);
      const res = await api.post<PosterMeta>('/api/faculty/uploads/poster', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPoster(res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setPosterError(err.response?.data?.message ?? 'อัปโหลดไม่สำเร็จ');
      setPoster(null);
    } finally {
      setPosterUploading(false);
    }
  }

  function handleRemovePoster() {
    setPoster(null);
    setPosterError(null);
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    setPosterPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const isLimited = mode === 'edit-limited';
  const payload = useMemo(
    () =>
      isLimited
        ? buildLimitedPayload(value)
        : { ...buildPayload(value), poster },
    [isLimited, value, poster],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    // โหมดเต็ม: ต้องมี poster + อัปโหลดเสร็จ; โหมดจำกัด: ข้ามทั้งสอง
    if (!isLimited) {
      if (!poster) {
        setSubmitError('กรุณาอัปโหลดภาพโปสเตอร์ก่อนบันทึก');
        return;
      }
      if (posterUploading) {
        setSubmitError('กรุณารอให้อัปโหลดภาพโปสเตอร์เสร็จก่อน');
        return;
      }
    }
    try {
      await onSave(payload);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = e.response?.data?.message || 'บันทึกไม่สำเร็จ';
        setSubmitError(msg);
      } else {
        setSubmitError('บันทึกไม่สำเร็จ');
      }
    }
  }

  if (!refs && !refsError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        กำลังโหลดข้อมูล...
      </div>
    );
  }
  if (refsError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {refsError}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner — โหมดจำกัด: บอกว่าฟิลด์ไหนแก้ได้ */}
      {isLimited && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            แก้ไขโหมดจำกัด — กิจกรรมเริ่มดำเนินการแล้ว
          </p>
          <p className="mt-1 text-xs text-amber-800">
            แก้ได้:
            จำนวนที่รับ · รายละเอียด · สถานที่ · วันเวลากิจกรรม · ช่วงรับสมัคร ·
            คณะที่รับสมัคร · ทักษะที่จะได้รับ · โหมดอนุมัติผู้สมัคร · งบประมาณที่จ่ายจริง
            <br />
            ฟิลด์อื่นที่จาง = ล็อกไว้ (ต้องการแก้ ทำได้เฉพาะตอน "ฉบับร่าง")
          </p>
        </div>
      )}

      {/* Section 0: ภาพโปสเตอร์ — ล็อกตอน limited */}
      <fieldset
        disabled={isLimited}
        className="space-y-6 disabled:opacity-60"
      >
      <Section title="ภาพโปสเตอร์กิจกรรม">
        <div className="grid gap-4 md:grid-cols-[200px_1fr] md:items-start">
          {/* Preview */}
          <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 md:h-52 md:w-48">
            {posterPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterPreviewUrl}
                alt="poster preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
                <ImagePlus className="h-8 w-8" aria-hidden />
                <span>ยังไม่มีภาพ</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={POSTER_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePosterFile(f);
              }}
              className="block w-full text-xs file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              JPG / PNG / WebP, ไม่เกิน {POSTER_MAX_BYTES / 1024 / 1024} MB
              <span className="ml-1 text-rose-500">*</span> ต้องอัปโหลด
            </p>

            {posterUploading && (
              <p className="text-xs text-blue-700">กำลังอัปโหลด...</p>
            )}
            {posterError && (
              <p className="text-xs text-rose-700">{posterError}</p>
            )}
            {poster && !posterUploading && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs">
                <span className="truncate text-emerald-900">
                  ✓ {poster.filename} ({Math.round(poster.size_bytes / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={handleRemovePoster}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-3 w-3" aria-hidden />
                  ลบ
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>
      </fieldset>

      {/* Section 1: ข้อมูลพื้นฐาน — title/org/category/year/sem ล็อกใน limited; description/location ยังแก้ได้ */}
      <Section title="ข้อมูลพื้นฐาน">
        <Field label="ชื่อกิจกรรม" required>
          <input
            type="text"
            value={value.title}
            onChange={(e) => setField('title', e.target.value)}
            className={inputClass}
            required
            disabled={isLimited}
          />
        </Field>
        <Field label="รายละเอียด">
          <textarea
            value={value.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={4}
            className={inputClass}
          />
        </Field>
        <Field label="สถานที่จัด" required>
          <input
            type="text"
            value={value.location}
            onChange={(e) => setField('location', e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <fieldset disabled={isLimited} className="contents">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="หน่วยงานเจ้าของ" required>
              <select
                value={value.organization_id ?? ''}
                onChange={(e) =>
                  setField(
                    'organization_id',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                className={inputClass}
                required
              >
                <option value="">— เลือก —</option>
                {refs!.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} · {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ประเภทกิจกรรม" required>
              <select
                value={value.category_id ?? ''}
                onChange={(e) =>
                  setField(
                    'category_id',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                className={inputClass}
                required
              >
                <option value="">— เลือก —</option>
                {refs!.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}. {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ปีการศึกษา (พ.ศ.)" required>
              <input
                type="number"
                value={value.academic_year}
                onChange={(e) =>
                  setField('academic_year', Number(e.target.value))
                }
                className={inputClass}
                min={2500}
                max={2700}
                required
              />
            </Field>
            <Field label="ภาคเรียน" required>
              <div className="flex gap-3 pt-2">
                {[1, 2, 3].map((s) => (
                  <label key={s} className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={value.semester === s}
                      onChange={() => setField('semester', s)}
                    />
                    {s === 3 ? 'ฤดูร้อน' : `${s}`}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </fieldset>
      </Section>

      {/* Section 2: เวลาและความจุ */}
      <Section title="เวลา จำนวนที่รับ">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="วันเวลาเริ่ม" required>
            <input
              type="datetime-local"
              value={value.start_at}
              onChange={(e) => setField('start_at', e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="วันเวลาสิ้นสุด" required>
            <input
              type="datetime-local"
              value={value.end_at}
              onChange={(e) => setField('end_at', e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="ชั่วโมงกิจกรรม" required hint="ใส่ทศนิยมได้ เช่น 2.5">
            <input
              type="number"
              value={value.hours}
              onChange={(e) => setField('hours', Number(e.target.value))}
              className={inputClass}
              min={0.1}
              step={0.1}
              required
              disabled={isLimited}
            />
          </Field>
          <Field
            label="ชั่วโมง กยศ"
            hint="0 = ไม่นับชั่วโมง กยศ; ใส่ทศนิยมได้"
          >
            <input
              type="number"
              value={value.loan_hours}
              onChange={(e) => setField('loan_hours', Number(e.target.value))}
              className={inputClass}
              min={0}
              step={0.1}
              disabled={isLimited}
            />
          </Field>
          <Field label="จำนวนที่รับ" required>
            <input
              type="number"
              value={value.capacity}
              onChange={(e) => setField('capacity', Number(e.target.value))}
              className={inputClass}
              min={1}
              required
            />
          </Field>
        </div>
      </Section>

      {/* Section 2.5: งบประมาณ — แหล่ง/ขอใช้ ล็อกใน limited; จ่ายจริง แก้ได้ */}
      <Section title="งบประมาณ">
        <fieldset disabled={isLimited} className="contents">
          <Field label="แหล่งงบประมาณ" required>
            <input
              type="text"
              value={value.budget_source}
              onChange={(e) => setField('budget_source', e.target.value)}
              className={inputClass}
              placeholder="เช่น งบประมาณรายจ่ายประจำปี / งบกิจการนิสิต / ผู้สนับสนุน X"
              required
            />
          </Field>
        </fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset disabled={isLimited} className="contents">
            <Field label="งบประมาณที่ขอใช้ (บาท)" required>
              <input
                type="number"
                value={value.budget_requested}
                onChange={(e) => setField('budget_requested', e.target.value)}
                className={inputClass}
                min={0}
                step="0.01"
                required
              />
            </Field>
          </fieldset>
          <Field label="งบประมาณที่จ่ายจริง (บาท)" hint="ใส่หลังกิจกรรมจบ">
            <input
              type="number"
              value={value.budget_actual}
              onChange={(e) => setField('budget_actual', e.target.value)}
              className={inputClass}
              min={0}
              step="0.01"
            />
          </Field>
        </div>
      </Section>

      {/* Section 3: การลงทะเบียน */}
      <Section title="การลงทะเบียน">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="เปิดรับสมัคร" required>
            <input
              type="datetime-local"
              value={value.registration_open_at}
              onChange={(e) => setField('registration_open_at', e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="ปิดรับสมัคร" required>
            <input
              type="datetime-local"
              value={value.registration_close_at}
              onChange={(e) =>
                setField('registration_close_at', e.target.value)
              }
              className={inputClass}
              required
            />
          </Field>
        </div>
        <Field label="โหมดอนุมัติผู้สมัคร">
          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                checked={value.approval_mode === 'AUTO'}
                onChange={() => setField('approval_mode', 'AUTO')}
              />
              อัตโนมัติ (AUTO)
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                checked={value.approval_mode === 'MANUAL'}
                onChange={() => setField('approval_mode', 'MANUAL')}
              />
              เจ้าหน้าที่อนุมัติ (MANUAL)
            </label>
          </div>
        </Field>
        <Field label="คณะที่รับสมัคร">
          <SelectableButtonGrid
            options={refs!.faculties.map((f) => ({ id: f.id, label: f.name }))}
            selected={value.eligible_faculty_ids}
            onChange={(ids) => setField('eligible_faculty_ids', ids)}
            emptyText="ยังไม่เลือก — เปิดรับทุกคณะ"
            countLabel={(n) => `เลือกแล้ว ${n} คณะ`}
            clearable
          />
        </Field>
        <Field label="ทักษะที่จะได้รับ" required>
          <SelectableButtonGrid
            options={refs!.skills.map((s) => ({
              id: s.id,
              label: `${s.code} ${s.name}`,
            }))}
            selected={value.skill_ids}
            onChange={(ids) => setField('skill_ids', ids)}
            emptyText="กรุณาเลือกอย่างน้อย 1 ทักษะ"
            countLabel={(n) => `เลือกแล้ว ${n} ทักษะ`}
            clearable={false}
          />
        </Field>
      </Section>

      {/* Section 4: ช่วงเวลา check-in สำหรับเจ้าหน้าที่ */}
      <fieldset disabled={isLimited} className="space-y-6 disabled:opacity-60">
      <Section title="ช่วงเวลา check-in (สำหรับเจ้าหน้าที่)">
        <p className="-mt-2 text-xs text-gray-500">
          ผู้เข้าร่วมจะใช้ QR ของตัวเอง (ระบบสร้างให้อัตโนมัติเมื่อลงทะเบียนสำเร็จ)
          มาแสดงต่อเจ้าหน้าที่เพื่อ scan ที่จุด check-in — ไม่ต้องตั้งค่าเพิ่ม
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="ช่วงเปิดเช็คอิน — เริ่ม"
            hint="ว่าง = 30 นาทีก่อนเริ่มกิจกรรม"
          >
            <input
              type="datetime-local"
              value={value.check_in_opens_at}
              onChange={(e) => setField('check_in_opens_at', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="ช่วงเปิดเช็คอิน — สิ้นสุด"
            hint="ว่าง = 15 นาทีหลังจบกิจกรรม"
          >
            <input
              type="datetime-local"
              value={value.check_in_closes_at}
              onChange={(e) => setField('check_in_closes_at', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>
      </fieldset>

      {submitError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : mode === 'create' ? 'บันทึกร่าง' : 'บันทึกการแก้ไข'}
        </button>
      </div>
    </form>
  );
}

// payload subset สำหรับโหมด limited (status=WORK)
//   ส่งเฉพาะ field ที่ backend อนุญาต — กัน accidental change ของ field สำคัญ
function buildLimitedPayload(v: ActivityFormValue) {
  return {
    capacity: v.capacity,
    description: v.description,
    location: v.location,
    start_at: localInputToIso(v.start_at),
    end_at: localInputToIso(v.end_at),
    registration_open_at: localInputToIso(v.registration_open_at),
    registration_close_at: localInputToIso(v.registration_close_at),
    approval_mode: v.approval_mode,
    budget_actual:
      v.budget_actual.trim() === '' ? null : Number(v.budget_actual),
    skill_ids: v.skill_ids,
    eligible_faculty_ids: v.eligible_faculty_ids,
  };
}

function buildPayload(v: ActivityFormValue) {
  return {
    title: v.title,
    description: v.description,
    location: v.location,
    organization_id: v.organization_id,
    category_id: v.category_id,
    academic_year: v.academic_year,
    semester: v.semester,
    hours: v.hours,
    loan_hours: v.loan_hours,
    capacity: v.capacity,
    start_at: localInputToIso(v.start_at),
    end_at: localInputToIso(v.end_at),
    registration_open_at: localInputToIso(v.registration_open_at),
    registration_close_at: localInputToIso(v.registration_close_at),
    approval_mode: v.approval_mode,
    check_in_opens_at: localInputToIso(v.check_in_opens_at),
    check_in_closes_at: localInputToIso(v.check_in_closes_at),
    budget_source: v.budget_source,
    budget_requested:
      v.budget_requested.trim() === '' ? null : Number(v.budget_requested),
    budget_actual:
      v.budget_actual.trim() === '' ? null : Number(v.budget_actual),
    skill_ids: v.skill_ids,
    eligible_faculty_ids: v.eligible_faculty_ids,
  };
}

// presentational helpers ─────────────────────────────────────────
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {hint && <span className="ml-2 text-xs text-gray-400">{hint}</span>}
      {children}
    </label>
  );
}

// SelectableButtonGrid: multi-select แบบ button flow
//   - กดปุ่ม → toggle (active = พื้นน้ำเงิน)
//   - flex-wrap: ปุ่มกว้างพอดี text เรียงต่อกันเป็น flow
//   - emptyText: ข้อความเมื่อยังไม่ได้เลือก (เช่น "เปิดรับทุกคณะ" / "กรุณาเลือกอย่างน้อย 1")
//   - countLabel(n): ข้อความเมื่อมีที่เลือกแล้ว
//   - clearable: แสดงปุ่ม "ล้างทั้งหมด" หรือไม่ (ปกติ true; field required ใส่ false)
function SelectableButtonGrid({
  options,
  selected,
  onChange,
  emptyText,
  countLabel,
  clearable = true,
}: {
  options: { id: number; label: string }[];
  selected: number[];
  onChange: (next: number[]) => void;
  emptyText: string;
  countLabel: (n: number) => string;
  clearable?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500">
          {selected.length === 0 ? emptyText : countLabel(selected.length)}
        </span>
        {clearable && selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3">
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((x) => x !== o.id)
                    : [...selected, o.id],
                )
              }
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
