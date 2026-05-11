'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  GraduationCap,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminStudentSummary, MasterFaculty } from '@/lib/types';
import { formatNumber } from '@/lib/format';

const PAGE_SIZE = 50;
const NUMBER_FMT = new Intl.NumberFormat('th-TH');

type SortKey =
  | 'name_asc'
  | 'name_desc'
  | 'hours_desc'
  | 'hours_asc'
  | 'last_login_desc';

const SORT_LABELS: Record<SortKey, string> = {
  name_asc: 'ชื่อ ก→ฮ',
  name_desc: 'ชื่อ ฮ→ก',
  hours_desc: 'ชั่วโมงมาก→น้อย',
  hours_asc: 'ชั่วโมงน้อย→มาก',
  last_login_desc: 'เข้าใช้ล่าสุด',
};

export default function AdminStudentsPage() {
  const [items, setItems] = useState<AdminStudentSummary[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [facultyId, setFacultyId] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('name_asc');

  const [faculties, setFaculties] = useState<MasterFaculty[]>([]);
  useEffect(() => {
    api
      .get<{ items: MasterFaculty[] }>('/api/faculties')
      .then((r) => setFaculties(r.data.items))
      .catch(() => {});
  }, []);

  // debounce search
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
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      params.set('sort', sort);
      if (search) params.set('q', search);
      if (facultyId !== 'all') params.set('faculty_id', String(facultyId));
      const res = await api.get<{ items: AdminStudentSummary[]; total: number }>(
        `/api/admin/students?${params.toString()}`,
      );
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
  }, [offset, sort, search, facultyId]);

  useEffect(() => {
    load();
  }, [load]);

  // filter change → reset offset
  useEffect(() => {
    setOffset(0);
  }, [search, facultyId, sort]);

  const totalPages = total && total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
  const currentPage = totalPages > 0 ? Math.floor(offset / PAGE_SIZE) + 1 : 1;
  const lastPageOffset = totalPages > 0 ? (totalPages - 1) * PAGE_SIZE : 0;
  const isFirst = offset === 0;
  const isLast = offset >= lastPageOffset;
  const fromItem = total === 0 ? 0 : offset + 1;
  const toItem = total !== null ? Math.min(offset + (items?.length ?? 0), total) : 0;

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <GraduationCap className="h-6 w-6 text-indigo-600" aria-hidden />
          การเข้าร่วมกิจกรรมของนิสิต
          {total !== null && (
            <span className="ml-1 text-sm font-medium text-gray-400">
              ({NUMBER_FMT.format(total)})
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          ค้นหา/ดูสรุปชั่วโมง · คลิกแถวเพื่อดูประวัติการเข้าร่วมรายคน
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-3 grid gap-2 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา รหัสนิสิต / ชื่อ / อีเมล"
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
          value={facultyId === 'all' ? '' : String(facultyId)}
          onChange={(e) => {
            const v = e.target.value;
            setFacultyId(v === '' ? 'all' : Number(v));
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-4 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="กรอง คณะ"
        >
          <option value="">ทุกคณะ</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="เรียง"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Pagination bar (top) */}
      <PaginationBar
        loading={loading}
        total={total}
        fromItem={fromItem}
        toItem={toItem}
        currentPage={currentPage}
        totalPages={totalPages}
        isFirst={isFirst}
        isLast={isLast}
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
            ไม่พบนิสิตตามเงื่อนไข
          </div>
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">นิสิต</th>
                  <th className="px-4 py-3 text-left">คณะ</th>
                  <th className="px-4 py-3 text-right">ลงทะเบียน</th>
                  <th className="px-4 py-3 text-right">ผ่าน</th>
                  <th className="px-4 py-3 text-right">ชั่วโมง</th>
                  <th className="px-4 py-3 text-right">ชม.กยศ</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
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
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {u.full_name}
                          </p>
                          {u.msu_id && (
                            <p className="truncate font-mono text-[11px] text-gray-500">
                              {u.msu_id}
                            </p>
                          )}
                          <p className="truncate text-xs text-gray-400">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {u.faculty_name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {formatNumber(u.registrations_count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.passed_count > 0 ? (
                        <span className="font-medium text-emerald-700">
                          {formatNumber(u.passed_count)}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                      {formatNumber(u.hours_total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                      {Number(u.loan_hours_total) > 0
                        ? formatNumber(u.loan_hours_total)
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/students/${u.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        ดูประวัติ
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
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

      {/* nice — bottom pagination too */}
      {items && items.length > 0 && (
        <div className="mt-3">
          <PaginationBar
            loading={loading}
            total={total}
            fromItem={fromItem}
            toItem={toItem}
            currentPage={currentPage}
            totalPages={totalPages}
            isFirst={isFirst}
            isLast={isLast}
            onJump={(p) => setOffset((p - 1) * PAGE_SIZE)}
            onFirst={() => setOffset(0)}
            onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)}
            onLast={() => setOffset(lastPageOffset)}
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <Users className="h-3.5 w-3.5" aria-hidden />
        <span>
          ชั่วโมงนับจาก registration ที่ <strong>evaluation_status = PASSED</strong>{' '}
          เท่านั้น (เหมือนสถิติของนิสิต)
        </span>
      </div>
    </div>
  );
}

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
          aria-label="หน้าแรก"
        >
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="ก่อนหน้า"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="ถัดไป"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="หน้าสุดท้าย"
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
              aria-label="ไปยังหน้า"
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
          className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
