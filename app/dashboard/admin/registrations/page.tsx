'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ListChecks,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type {
  AdminRegistrationRow,
  EvaluationStatus,
  MasterFaculty,
  RegistrationStatus,
} from '@/lib/types';

const PAGE_SIZE = 50;
const NUMBER_FMT = new Intl.NumberFormat('th-TH');
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const REG_STATUS_LABEL: Record<
  RegistrationStatus,
  { text: string; tone: string }
> = {
  PENDING_APPROVAL: { text: 'รออนุมัติ', tone: 'bg-amber-100 text-amber-800' },
  REGISTERED: { text: 'ลงทะเบียน', tone: 'bg-blue-100 text-blue-800' },
  WAITLISTED: { text: 'รอคิว', tone: 'bg-gray-100 text-gray-700' },
  CANCELLED_BY_USER: { text: 'ยกเลิก', tone: 'bg-gray-100 text-gray-600' },
  CANCELLED_BY_STAFF: { text: 'จนท.ยกเลิก', tone: 'bg-gray-100 text-gray-600' },
  REJECTED_BY_STAFF: { text: 'จนท.ปฏิเสธ', tone: 'bg-rose-100 text-rose-700' },
  ATTENDED: { text: 'เช็คอินแล้ว', tone: 'bg-emerald-100 text-emerald-800' },
  NO_SHOW: { text: 'ไม่ได้เข้าร่วม', tone: 'bg-gray-100 text-gray-700' },
};
const EVAL_LABEL: Record<EvaluationStatus, { text: string; tone: string }> = {
  PENDING_EVALUATION: {
    text: 'รอประเมิน',
    tone: 'bg-amber-100 text-amber-800',
  },
  PASSED: { text: 'ผ่าน', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { text: 'ไม่ผ่าน', tone: 'bg-rose-100 text-rose-800' },
};

export default function AdminRegistrationsPage() {
  const [items, setItems] = useState<AdminRegistrationRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [studentFacultyId, setStudentFacultyId] = useState<number | 'all'>('all');
  const [activityFacultyId, setActivityFacultyId] = useState<number | 'all'>('all');
  const [regStatus, setRegStatus] = useState<RegistrationStatus | 'all'>('all');
  const [evalStatus, setEvalStatus] = useState<EvaluationStatus | 'all'>('all');
  const [academicYear, setAcademicYear] = useState<number | 'all'>('all');

  const [faculties, setFaculties] = useState<MasterFaculty[]>([]);
  useEffect(() => {
    api
      .get<{ items: MasterFaculty[] }>('/api/faculties')
      .then((r) => setFaculties(r.data.items))
      .catch(() => {});
  }, []);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = buildParams({
        limit: PAGE_SIZE,
        offset,
        search,
        studentFacultyId,
        activityFacultyId,
        regStatus,
        evalStatus,
        academicYear,
      });
      const res = await api.get<{
        items: AdminRegistrationRow[];
        total: number;
      }>(`/api/admin/registrations?${params}`);
      if (seq !== fetchSeq.current) return;
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (e: unknown) {
      if (seq !== fetchSeq.current) return;
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [
    offset,
    search,
    studentFacultyId,
    activityFacultyId,
    regStatus,
    evalStatus,
    academicYear,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  // filter change → reset offset
  useEffect(() => {
    setOffset(0);
  }, [search, studentFacultyId, activityFacultyId, regStatus, evalStatus, academicYear]);

  const totalPages = total && total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
  const currentPage = totalPages > 0 ? Math.floor(offset / PAGE_SIZE) + 1 : 1;
  const lastPageOffset = totalPages > 0 ? (totalPages - 1) * PAGE_SIZE : 0;
  const fromItem = total === 0 ? 0 : offset + 1;
  const toItem = total !== null ? Math.min(offset + (items?.length ?? 0), total) : 0;

  const csvHref =
    `${API_BASE}/api/admin/registrations.csv?` +
    buildParams({
      search,
      studentFacultyId,
      activityFacultyId,
      regStatus,
      evalStatus,
      academicYear,
    });

  function clearAll() {
    setSearchInput('');
    setSearch('');
    setStudentFacultyId('all');
    setActivityFacultyId('all');
    setRegStatus('all');
    setEvalStatus('all');
    setAcademicYear('all');
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ListChecks className="h-6 w-6 text-indigo-600" aria-hidden />
            ค้นข้ามกิจกรรม-นิสิต
            {total !== null && (
              <span className="ml-1 text-sm font-medium text-gray-400">
                ({NUMBER_FMT.format(total)})
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ดูรายการลงทะเบียนทั้งหมด · filter ตาม นิสิต / คณะ / สถานะ / ปี
          </p>
        </div>
        <a
          href={csvHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </a>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-3 grid gap-2 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา รหัสนิสิต / ชื่อ / ชื่อกิจกรรม / รหัสกิจกรรม"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-9 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {searchInput.trim() !== search && searchInput.length > 0 && (
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
          value={String(studentFacultyId)}
          onChange={(e) => {
            const v = e.target.value;
            setStudentFacultyId(v === 'all' ? 'all' : Number(v));
          }}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm md:col-span-3"
          aria-label="คณะของนิสิต"
        >
          <option value="all">คณะนิสิต: ทุกคณะ</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              คณะ: {f.name}
            </option>
          ))}
        </select>
        <select
          value={String(activityFacultyId)}
          onChange={(e) => {
            const v = e.target.value;
            setActivityFacultyId(v === 'all' ? 'all' : Number(v));
          }}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm md:col-span-2"
          aria-label="คณะที่จัดกิจกรรม"
        >
          <option value="all">จัดโดย: ทุกคณะ</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              จัดโดย {f.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={academicYear === 'all' ? '' : academicYear}
          onChange={(e) => {
            const v = e.target.value;
            setAcademicYear(v === '' ? 'all' : Number(v));
          }}
          placeholder="ปีการศึกษา"
          min={2500}
          max={2700}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-2"
        />

        <select
          value={regStatus}
          onChange={(e) => setRegStatus(e.target.value as RegistrationStatus | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm md:col-span-3"
        >
          <option value="all">ทุกสถานะลงทะเบียน</option>
          {(Object.keys(REG_STATUS_LABEL) as RegistrationStatus[]).map((s) => (
            <option key={s} value={s}>
              {REG_STATUS_LABEL[s].text}
            </option>
          ))}
        </select>
        <select
          value={evalStatus}
          onChange={(e) => setEvalStatus(e.target.value as EvaluationStatus | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm md:col-span-3"
        >
          <option value="all">ทุกผลประเมิน</option>
          {(Object.keys(EVAL_LABEL) as EvaluationStatus[]).map((s) => (
            <option key={s} value={s}>
              {EVAL_LABEL[s].text}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 md:col-span-6"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <PaginationBar
        loading={loading}
        total={total}
        fromItem={fromItem}
        toItem={toItem}
        currentPage={currentPage}
        totalPages={totalPages}
        isFirst={offset === 0}
        isLast={offset >= lastPageOffset}
        onJump={(p) => setOffset((p - 1) * PAGE_SIZE)}
        onFirst={() => setOffset(0)}
        onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        onNext={() => setOffset(offset + PAGE_SIZE)}
        onLast={() => setOffset(lastPageOffset)}
      />

      <div className="relative mt-2">
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            ไม่พบ registration ตามเงื่อนไข
          </div>
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">นิสิต</th>
                  <th className="px-3 py-3 text-left">กิจกรรม</th>
                  <th className="px-3 py-3 text-left">ปี</th>
                  <th className="px-3 py-3 text-left">สถานะ</th>
                  <th className="px-3 py-3 text-left">ผลประเมิน</th>
                  <th className="px-3 py-3 text-right">ชม.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => {
                  const regLbl = REG_STATUS_LABEL[r.registration_status];
                  const evalLbl = r.evaluation_status
                    ? EVAL_LABEL[r.evaluation_status]
                    : null;
                  return (
                    <tr key={r.registration_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/admin/students/${r.user_id}`}
                          className="block"
                        >
                          <p className="font-medium text-gray-900 hover:text-indigo-700">
                            {r.student_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.msu_id && (
                              <span className="font-mono">{r.msu_id}</span>
                            )}
                            {r.student_faculty_name && (
                              <span className="ml-2 text-gray-400">
                                · {r.student_faculty_name}
                              </span>
                            )}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/admin/activities/${r.activity_id}`}
                          className="block"
                        >
                          <p className="font-medium text-gray-900 hover:text-indigo-700">
                            {r.activity_title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.activity_code && (
                              <span className="font-mono">{r.activity_code}</span>
                            )}
                            <span className="ml-2 text-gray-400">
                              · {r.category_name}
                              {r.activity_faculty_name && (
                                <> · {r.activity_faculty_name}</>
                              )}
                            </span>
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {r.academic_year}/{r.semester}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${regLbl.tone}`}
                        >
                          {regLbl.text}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {evalLbl ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${evalLbl.tone}`}
                          >
                            {evalLbl.text}
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
                })}
              </tbody>
            </table>
          </div>
        )}
        {loading && items && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]">
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md ring-1 ring-gray-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" aria-hidden />
              กำลังโหลด...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildParams(o: {
  limit?: number;
  offset?: number;
  search: string;
  studentFacultyId: number | 'all';
  activityFacultyId: number | 'all';
  regStatus: RegistrationStatus | 'all';
  evalStatus: EvaluationStatus | 'all';
  academicYear: number | 'all';
}): string {
  const p = new URLSearchParams();
  if (o.limit !== undefined) p.set('limit', String(o.limit));
  if (o.offset !== undefined) p.set('offset', String(o.offset));
  if (o.search) p.set('q', o.search);
  if (o.studentFacultyId !== 'all')
    p.set('student_faculty_id', String(o.studentFacultyId));
  if (o.activityFacultyId !== 'all')
    p.set('activity_faculty_id', String(o.activityFacultyId));
  if (o.regStatus !== 'all') p.set('status', o.regStatus);
  if (o.evalStatus !== 'all') p.set('evaluation_status', o.evalStatus);
  if (o.academicYear !== 'all') p.set('academic_year', String(o.academicYear));
  return p.toString();
}

// reused from students page — minimal duplication acceptable
function PaginationBar({
  loading,
  total,
  fromItem,
  toItem,
  currentPage,
  totalPages,
  isFirst,
  isLast,
  onJump,
  onFirst,
  onPrev,
  onNext,
  onLast,
}: {
  loading: boolean;
  total: number | null;
  fromItem: number;
  toItem: number;
  currentPage: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  onJump: (page: number) => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}) {
  const [pageInput, setPageInput] = useState('');
  function jump() {
    const p = Number(pageInput);
    if (!Number.isInteger(p) || p < 1 || p > totalPages) return;
    onJump(p);
    setPageInput('');
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
      <span>
        {total === null
          ? 'กำลังโหลด...'
          : total === 0
            ? '0 รายการ'
            : (
              <>
                <span className="font-semibold text-gray-900">
                  {NUMBER_FMT.format(fromItem)}–{NUMBER_FMT.format(toItem)}
                </span>{' '}
                จาก{' '}
                <span className="font-semibold text-gray-900">
                  {NUMBER_FMT.format(total)}
                </span>
              </>
            )}
      </span>
      <div className="flex items-center gap-1">
        {totalPages > 1 && (
          <span className="mr-2 text-gray-500">
            หน้า{' '}
            <span className="font-semibold text-gray-900">
              {NUMBER_FMT.format(currentPage)}
            </span>{' '}
            / {NUMBER_FMT.format(totalPages)}
          </span>
        )}
        <button
          type="button"
          onClick={onFirst}
          disabled={isFirst || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        {totalPages > 5 && (
          <div className="ml-2 flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && jump()}
              placeholder="ไป#"
              className="w-14 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={jump}
              disabled={!pageInput || loading}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
            >
              ไป
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
