'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatActivityRange, formatNumber } from '@/lib/format';
import { StatusBadge, STATUS_LIST } from '@/components/faculty/StatusBadge';
import type {
  ActivityStatus,
  AdminActivitySummary,
} from '@/lib/types';

interface FacultyOption {
  id: number;
  code: string;
  name: string;
}

interface AcademicYearsResponse {
  current: number;
  available: number[];
}

type SortKey =
  | 'updated_desc'
  | 'updated_asc'
  | 'start_asc'
  | 'start_desc'
  | 'title_asc'
  | 'title_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated_desc', label: 'อัปเดตล่าสุด' },
  { value: 'updated_asc', label: 'อัปเดตเก่าสุด' },
  { value: 'start_asc', label: 'เริ่มเร็วที่สุด' },
  { value: 'start_desc', label: 'เริ่มล่าสุด' },
  { value: 'title_asc', label: 'ชื่อ ก → ฮ' },
  { value: 'title_desc', label: 'ชื่อ ฮ → ก' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const DEFAULT_PAGE_SIZE = 50;

function AdminActivitiesPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // ── filter state อ่านจาก URL (sharable + reload-safe) ──
  const status = params.get('status') as ActivityStatus | null;
  const facultyIdRaw = params.get('faculty_id');
  const facultyId =
    facultyIdRaw && /^\d+$/.test(facultyIdRaw) ? Number(facultyIdRaw) : null;
  const academicYearRaw = params.get('academic_year');
  const academicYear =
    academicYearRaw && /^\d+$/.test(academicYearRaw)
      ? Number(academicYearRaw)
      : null;
  const searchUrl = params.get('search') ?? '';
  const sortRaw = params.get('sort') as SortKey | null;
  const sortKey: SortKey =
    sortRaw && SORT_OPTIONS.some((o) => o.value === sortRaw)
      ? sortRaw
      : 'updated_desc';
  const pageSizeRaw = params.get('page_size');
  const pageSize =
    pageSizeRaw && PAGE_SIZE_OPTIONS.includes(Number(pageSizeRaw))
      ? Number(pageSizeRaw)
      : DEFAULT_PAGE_SIZE;
  const pageRaw = params.get('page');
  const page =
    pageRaw && /^\d+$/.test(pageRaw) && Number(pageRaw) >= 1
      ? Number(pageRaw)
      : 1;

  // ── data state ──
  // เก็บ items ไว้ตลอด → ตอน reload ใช้ stale-while-revalidate (โชว์ของเก่า + dim) แทน clear → null
  const [items, setItems] = useState<AdminActivitySummary[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ── lookup data ──
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [defaultAcademicYear, setDefaultAcademicYear] = useState<number | null>(
    null,
  );

  // search input local state — debounce ก่อน push เข้า URL
  const [searchInput, setSearchInput] = useState(searchUrl);
  useEffect(() => setSearchInput(searchUrl), [searchUrl]);

  // bulk selection — เก็บเฉพาะ id ที่ status PENDING_APPROVAL (visible bulk approve/reject)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingApprove, setPendingApprove] =
    useState<AdminActivitySummary | null>(null);
  const [pendingReject, setPendingReject] =
    useState<AdminActivitySummary | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  // โหลด lookup data ครั้งเดียวตอน mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [facRes, yearsRes] = await Promise.all([
          api.get<{ items: FacultyOption[] }>('/api/faculties?is_active=true'),
          api.get<AcademicYearsResponse>('/api/admin/academic-years'),
        ]);
        if (cancelled) return;
        setFaculties(facRes.data.items);
        setAvailableYears(yearsRes.data.available);
        setDefaultAcademicYear(yearsRes.data.current);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดตัวเลือกไม่สำเร็จ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ถ้า URL ยังไม่มี academic_year → fill default = current (replace URL ครั้งเดียว)
  useEffect(() => {
    if (academicYear === null && defaultAcademicYear !== null) {
      const next = new URLSearchParams(params.toString());
      next.set('academic_year', String(defaultAcademicYear));
      router.replace(`/dashboard/admin/activities?${next.toString()}`);
    }
  }, [academicYear, defaultAcademicYear, params, router]);

  // โหลดรายการตาม filter ทุกครั้งที่ URL เปลี่ยน — stale-while-revalidate
  async function loadItems(showLoading = true) {
    if (academicYear === null) return;
    if (showLoading) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (facultyId !== null) qs.set('faculty_id', String(facultyId));
      qs.set('academic_year', String(academicYear));
      if (searchUrl) qs.set('search', searchUrl);
      qs.set('sort', sortKey);
      qs.set('limit', String(pageSize));
      qs.set('offset', String((page - 1) * pageSize));
      const res = await api.get<{
        items: AdminActivitySummary[];
        total: number;
      }>(`/api/admin/activities?${qs.toString()}`);
      setItems(res.data.items);
      setTotal(res.data.total);
      setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (academicYear === null) return;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        if (facultyId !== null) qs.set('faculty_id', String(facultyId));
        qs.set('academic_year', String(academicYear));
        if (searchUrl) qs.set('search', searchUrl);
        qs.set('sort', sortKey);
        qs.set('limit', String(pageSize));
        qs.set('offset', String((page - 1) * pageSize));
        const res = await api.get<{
          items: AdminActivitySummary[];
          total: number;
        }>(`/api/admin/activities?${qs.toString()}`);
        if (cancelled) return;
        setItems(res.data.items);
        setTotal(res.data.total);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, facultyId, academicYear, searchUrl, sortKey, pageSize, page]);

  // เคลียร์ selection ทุกครั้งที่ filter/page/sort เปลี่ยน — กันสับสน
  useEffect(() => {
    setSelectedIds(new Set());
  }, [status, facultyId, academicYear, searchUrl, sortKey, pageSize, page]);

  // helper: replace URL พร้อม patch params (reset page เมื่อ filter/sort/page_size เปลี่ยน)
  function patch(next: Record<string, string | number | null>) {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') qs.delete(k);
      else qs.set(k, String(v));
    }
    if (!('page' in next)) qs.delete('page');
    router.replace(`/dashboard/admin/activities?${qs.toString()}`);
  }

  // debounce search 300ms
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onSearchChange(v: string) {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      patch({ search: v.trim() || null });
    }, 300);
  }

  // ── selection helpers ──
  const pendingItems = useMemo(
    () => (items ?? []).filter((a) => a.status === 'PENDING_APPROVAL'),
    [items],
  );
  const allPendingSelected =
    pendingItems.length > 0 &&
    pendingItems.every((a) => selectedIds.has(a.id));

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPending() {
    setSelectedIds((prev) => {
      if (allPendingSelected) {
        const next = new Set(prev);
        pendingItems.forEach((a) => next.delete(a.id));
        return next;
      }
      return new Set([...prev, ...pendingItems.map((a) => a.id)]);
    });
  }

  // ── action handlers ──
  async function executeApprove() {
    if (!pendingApprove) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${pendingApprove.id}/approve`);
      toast.success(`อนุมัติ "${pendingApprove.title}" แล้ว`);
      setPendingApprove(null);
      await loadItems(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'อนุมัติไม่สำเร็จ');
      setPendingApprove(null);
    } finally {
      setBusy(false);
    }
  }

  async function executeReject() {
    if (!pendingReject) return;
    if (!rejectReason.trim()) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${pendingReject.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success(`ส่งคืน "${pendingReject.title}" ให้คณะแก้ไข`);
      setPendingReject(null);
      setRejectReason('');
      await loadItems(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ปฏิเสธไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function executeBulkApprove() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await api.post<{
        status: 'ok';
        approved: number[];
        skipped: number[];
      }>('/api/admin/activities/bulk-approve', { activity_ids: ids });
      const { approved, skipped } = res.data;
      if (skipped.length === 0) {
        toast.success(`อนุมัติ ${approved.length} กิจกรรมแล้ว`);
      } else {
        toast.success(
          `อนุมัติ ${approved.length} — ข้าม ${skipped.length} (สถานะไม่ใช่ "รออนุมัติ")`,
        );
      }
      setBulkApproveOpen(false);
      setSelectedIds(new Set());
      await loadItems(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'อนุมัติไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function executeBulkReject() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!rejectReason.trim()) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{
        status: 'ok';
        rejected: number[];
        skipped: number[];
      }>('/api/admin/activities/bulk-reject', {
        activity_ids: ids,
        reason: rejectReason.trim(),
      });
      const { rejected, skipped } = res.data;
      if (skipped.length === 0) {
        toast.success(`ส่งคืน ${rejected.length} กิจกรรมให้คณะแก้ไข`);
      } else {
        toast.success(
          `ส่งคืน ${rejected.length} — ข้าม ${skipped.length} (สถานะไม่ใช่ "รออนุมัติ")`,
        );
      }
      setBulkRejectOpen(false);
      setRejectReason('');
      setSelectedIds(new Set());
      await loadItems(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ปฏิเสธไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  // ── derived UI helpers ──
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showEnd = Math.min(page * pageSize, total);
  const facultyName =
    facultyId !== null
      ? faculties.find((f) => f.id === facultyId)?.name
      : null;
  const statusLabel = status
    ? STATUS_LIST.find((s) => s.value === status)?.label
    : null;
  const isFiltered =
    status !== null ||
    facultyId !== null ||
    !!searchUrl ||
    (academicYear !== null && academicYear !== defaultAcademicYear);

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">กิจกรรมทุกคณะ</h1>
          <p className="mt-1 text-sm text-gray-500">
            ค้นหา กรอง และอนุมัติกิจกรรมจากทุกคณะ
          </p>
        </div>
        <Link
          href="/dashboard/faculty/activities/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          สร้างกิจกรรม
        </Link>
      </div>

      {/* Sticky toolbar — filter + search */}
      <div className="sticky top-0 z-20 mb-3 -mx-2 rounded-2xl border border-gray-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur-sm md:mx-0 md:px-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
          {/* search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหา ชื่อกิจกรรม / รหัสกิจกรรม"
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="ล้างคำค้นหา"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* status */}
          <select
            value={status ?? ''}
            onChange={(e) =>
              patch({ status: e.target.value === '' ? null : e.target.value })
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="กรองตามสถานะ"
          >
            <option value="">ทุกสถานะ</option>
            {STATUS_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* faculty */}
          <select
            value={facultyId ?? ''}
            onChange={(e) =>
              patch({ faculty_id: e.target.value === '' ? null : e.target.value })
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="กรองตามคณะ"
          >
            <option value="">ทุกคณะ</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* academic year */}
          <select
            value={academicYear ?? ''}
            onChange={(e) => patch({ academic_year: e.target.value })}
            disabled={availableYears.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
            aria-label="ปีการศึกษา"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                ปี {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter chips + result info + sort + page-size */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-gray-500">
          <span>
            พบ <span className="font-semibold text-gray-900">{total}</span> รายการ
          </span>
          {isFiltered && (
            <>
              <Filter className="h-3 w-3 text-gray-400" aria-hidden />
              {statusLabel && (
                <FilterChip
                  label={statusLabel}
                  onClear={() => patch({ status: null })}
                />
              )}
              {facultyName && (
                <FilterChip
                  label={facultyName}
                  onClear={() => patch({ faculty_id: null })}
                />
              )}
              {searchUrl && (
                <FilterChip
                  label={`"${searchUrl}"`}
                  onClear={() => onSearchChange('')}
                />
              )}
              <button
                type="button"
                onClick={() =>
                  router.replace(
                    `/dashboard/admin/activities?academic_year=${defaultAcademicYear ?? ''}`,
                  )
                }
                className="rounded text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1 text-gray-600">
            <ArrowDownUp className="h-3.5 w-3.5 text-gray-400" aria-hidden />
            <span>เรียง</span>
            <select
              value={sortKey}
              onChange={(e) => patch({ sort: e.target.value })}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1 text-gray-600">
            <span>ต่อหน้า</span>
            <select
              value={pageSize}
              onChange={(e) => patch({ page_size: e.target.value })}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Bulk action bar — sticky เมื่อเลือก ≥1 PENDING */}
      {selectedIds.size > 0 && (
        <div className="sticky top-[60px] z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-300 bg-indigo-50/95 px-4 py-2.5 shadow-md backdrop-blur-sm">
          <p className="text-sm text-indigo-900">
            <span className="font-semibold">
              เลือก {selectedIds.size} รายการ
            </span>
            <span className="ml-2 text-xs text-indigo-700">
              (เฉพาะที่อยู่ในสถานะ "รออนุมัติ")
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBulkApproveOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              อนุมัติ {selectedIds.size} รายการ
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectReason('');
                setBulkRejectOpen(true);
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              ไม่อนุมัติ {selectedIds.size} รายการ
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              ยกเลิกการเลือก
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {!items && !error && <ListSkeleton />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          ไม่มีรายการที่ตรงกับเงื่อนไข
        </div>
      )}

      {items && items.length > 0 && (
        <div
          className={`overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm transition-opacity ${
            loading ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-[0px] z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-sm">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  {pendingItems.length > 0 && (
                    <input
                      type="checkbox"
                      aria-label="เลือกทุกที่รออนุมัติในหน้านี้"
                      title="เลือกทุกที่รออนุมัติในหน้านี้"
                      checked={allPendingSelected}
                      onChange={toggleSelectAllPending}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left">กิจกรรม</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">
                  คณะ
                </th>
                <th className="px-4 py-3 text-left">สถานะ</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">
                  เวลา
                </th>
                <th className="px-4 py-3 text-right">ที่นั่ง</th>
                <th className="px-4 py-3 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  selected={selectedIds.has(a.id)}
                  busy={busy}
                  onToggleSelect={() => toggleSelect(a.id)}
                  onApprove={() => setPendingApprove(a)}
                  onReject={() => {
                    setRejectReason('');
                    setPendingReject(a);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <Pagination
          page={page}
          totalPages={totalPages}
          showStart={showStart}
          showEnd={showEnd}
          total={total}
          onPageChange={(p) => patch({ page: p })}
        />
      )}

      {/* Single approve confirm */}
      <ConfirmDialog
        open={!!pendingApprove}
        title="อนุมัติกิจกรรมนี้?"
        message={
          pendingApprove && (
            <>
              อนุมัติให้ <strong>{pendingApprove.title}</strong>{' '}
              เริ่มดำเนินการได้ — สถานะจะเปลี่ยนเป็น "ดำเนินการ"
            </>
          )
        }
        confirmLabel="อนุมัติ"
        loading={busy}
        onConfirm={executeApprove}
        onCancel={() => setPendingApprove(null)}
      />

      {/* Bulk approve confirm */}
      <ConfirmDialog
        open={bulkApproveOpen}
        title={`อนุมัติ ${selectedIds.size} กิจกรรม?`}
        message={
          <>
            อนุมัติพร้อมกัน <strong>{selectedIds.size} กิจกรรม</strong> —
            เฉพาะที่อยู่ในสถานะ "รออนุมัติ" จะถูกอนุมัติ รายการอื่นจะถูกข้าม
          </>
        }
        confirmLabel={`อนุมัติ ${selectedIds.size} รายการ`}
        loading={busy}
        onConfirm={executeBulkApprove}
        onCancel={() => setBulkApproveOpen(false)}
      />

      {/* Single reject dialog (with reason) */}
      <RejectDialog
        open={!!pendingReject}
        title="ไม่อนุมัติกิจกรรม?"
        subtitle={
          pendingReject ? (
            <>
              ระบุเหตุผลให้คณะนำไปแก้ไข <strong>{pendingReject.title}</strong>
            </>
          ) : null
        }
        reason={rejectReason}
        onReasonChange={setRejectReason}
        confirmLabel="ส่งคืนให้แก้ไข"
        loading={busy}
        onConfirm={executeReject}
        onCancel={() => {
          setPendingReject(null);
          setRejectReason('');
        }}
      />

      {/* Bulk reject dialog (single reason for all) */}
      <RejectDialog
        open={bulkRejectOpen}
        title={`ไม่อนุมัติ ${selectedIds.size} กิจกรรม?`}
        subtitle={
          <>
            ระบุเหตุผลร่วมกันสำหรับ <strong>{selectedIds.size} กิจกรรม</strong>{' '}
            (ทุกตัวจะกลับเป็นฉบับร่างพร้อมเหตุผลเดียวกัน)
          </>
        }
        reason={rejectReason}
        onReasonChange={setRejectReason}
        confirmLabel={`ส่งคืน ${selectedIds.size} รายการ`}
        loading={busy}
        onConfirm={executeBulkReject}
        onCancel={() => {
          setBulkRejectOpen(false);
          setRejectReason('');
        }}
      />
    </div>
  );
}

function ActivityRow({
  activity,
  selected,
  busy,
  onToggleSelect,
  onApprove,
  onReject,
}: {
  activity: AdminActivitySummary;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = activity.status === 'PENDING_APPROVAL';
  return (
    <tr
      className={`transition-colors ${
        selected
          ? 'bg-indigo-50/60'
          : isPending
            ? 'bg-amber-50/30 hover:bg-amber-50/60'
            : 'hover:bg-gray-50'
      }`}
    >
      <td className="w-10 px-3 py-3 align-top">
        {isPending && (
          <input
            type="checkbox"
            aria-label={`เลือก ${activity.title}`}
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <Link
          href={`/dashboard/admin/activities/${activity.id}`}
          className="block"
        >
          {activity.code && (
            <p className="text-xs font-mono text-gray-400">{activity.code}</p>
          )}
          <p className="font-medium text-gray-900 hover:text-indigo-700">
            {activity.title}
          </p>
          <p className="text-xs text-gray-500">
            {activity.organization_name} · โดย {activity.created_by_name}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 md:hidden">
            {activity.faculty_name ?? '—'}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 lg:hidden">
            {formatActivityRange(activity.start_at, activity.end_at)}
          </p>
        </Link>
      </td>
      <td className="hidden px-4 py-3 align-top text-xs text-gray-700 md:table-cell">
        {activity.faculty_name ?? '—'}
      </td>
      <td className="px-4 py-3 align-top">
        <StatusBadge status={activity.status} />
      </td>
      <td className="hidden px-4 py-3 align-top text-xs text-gray-600 lg:table-cell">
        {formatActivityRange(activity.start_at, activity.end_at)}
      </td>
      <td className="px-4 py-3 text-right align-top text-xs text-gray-600">
        {formatNumber(activity.registered_count)}/
        {formatNumber(activity.capacity)}
      </td>
      <td className="px-4 py-3 text-right align-top">
        {isPending ? (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              title="อนุมัติ"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              อนุมัติ
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              title="ไม่อนุมัติ"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              ไม่อนุมัติ
            </button>
          </div>
        ) : (
          <Link
            href={`/dashboard/admin/activities/${activity.id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            ดูรายละเอียด →
          </Link>
        )}
      </td>
    </tr>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded p-0.5 hover:bg-indigo-100"
        aria-label={`ล้างตัวกรอง ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function RejectDialog({
  open,
  title,
  subtitle,
  reason,
  onReasonChange,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  subtitle: React.ReactNode;
  reason: string;
  onReasonChange: (v: string) => void;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="px-5 py-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            เหตุผล <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={loading}
            maxLength={1000}
            placeholder="เช่น โปสเตอร์ไม่ชัด, ข้อมูลกิจกรรมยังไม่ครบ"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {reason.length}/1000
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึก...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  showStart,
  showEnd,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  showStart: number;
  showEnd: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const pageNumbers = useMemo<(number | 'gap')[]>(() => {
    const out: (number | 'gap')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) out.push(i);
    } else {
      out.push(1);
      if (page > 3) out.push('gap');
      const rs = Math.max(2, page - 1);
      const re = Math.min(totalPages - 1, page + 1);
      for (let i = rs; i <= re; i++) out.push(i);
      if (page < totalPages - 2) out.push('gap');
      out.push(totalPages);
    }
    return out;
  }, [page, totalPages]);

  return (
    <nav
      aria-label="หน้า"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-xs text-gray-500">
        แสดง <span className="font-semibold text-gray-900">{showStart}</span>
        {showStart !== showEnd && (
          <>
            {' '}–<span className="font-semibold text-gray-900"> {showEnd}</span>
          </>
        )}{' '}
        จาก <span className="font-semibold text-gray-900">{total}</span> รายการ
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          ก่อน
        </button>
        {pageNumbers.map((p, i) =>
          p === 'gap' ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-xs text-gray-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`min-w-[2rem] rounded-md px-2 py-1 text-xs font-medium ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="หน้าถัดไป"
        >
          ถัดไป
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
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

export default function AdminActivitiesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AdminActivitiesPageInner />
    </Suspense>
  );
}
