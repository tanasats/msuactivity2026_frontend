'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  QrCode,
  Search,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { BulkAddDialog } from '@/components/faculty/BulkAddDialog';
import { BulkEvaluateDialog } from '@/components/faculty/BulkEvaluateDialog';
import { EvaluateDialog } from '@/components/faculty/EvaluateDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type {
  EvaluationStatus,
  FacultyActivityDetail,
  FacultyRegistration,
  RegistrationStatus,
} from '@/lib/types';

const STATUS_LABELS: Record<RegistrationStatus, { th: string; tone: string }> = {
  PENDING_APPROVAL: { th: 'รออนุมัติ', tone: 'bg-amber-100 text-amber-800' },
  REGISTERED: { th: 'อนุมัติเข้าร่วม', tone: 'bg-emerald-100 text-emerald-800' },
  WAITLISTED: { th: 'Waitlist', tone: 'bg-blue-100 text-blue-800' },
  CANCELLED_BY_USER: { th: 'นิสิตยกเลิก', tone: 'bg-gray-100 text-gray-700' },
  CANCELLED_BY_STAFF: { th: 'เจ้าหน้าที่ยกเลิก', tone: 'bg-gray-100 text-gray-700' },
  REJECTED_BY_STAFF: { th: 'ปฏิเสธ', tone: 'bg-rose-100 text-rose-800' },
  ATTENDED: { th: 'เช็คอินแล้ว', tone: 'bg-emerald-100 text-emerald-800' },
  NO_SHOW: { th: 'ไม่ได้เข้าร่วม', tone: 'bg-gray-200 text-gray-800' },
};

const EVALUATION_LABELS: Record<EvaluationStatus, { th: string; tone: string }> = {
  PENDING_EVALUATION: { th: 'รอประเมิน', tone: 'bg-amber-100 text-amber-800' },
  PASSED: { th: 'ผ่าน', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { th: 'ไม่ผ่าน', tone: 'bg-rose-100 text-rose-800' },
};

type Filter = 'all' | 'pending' | 'registered' | 'cancelled' | 'attended';

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'registered', label: 'อนุมัติแล้ว' },
  { value: 'attended', label: 'เช็คอินแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก/ปฏิเสธ' },
];

const FILTER_STATUSES: Record<Filter, RegistrationStatus[] | null> = {
  all: null,
  pending: ['PENDING_APPROVAL'],
  registered: ['REGISTERED'],
  attended: ['ATTENDED'],
  cancelled: ['CANCELLED_BY_USER', 'CANCELLED_BY_STAFF', 'REJECTED_BY_STAFF'],
};

type SortKey = 'time_asc' | 'time_desc' | 'name_asc' | 'name_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'time_asc', label: 'สมัครก่อน → หลัง' },
  { value: 'time_desc', label: 'สมัครหลัง → ก่อน' },
  { value: 'name_asc', label: 'ชื่อ ก → ฮ' },
  { value: 'name_desc', label: 'ชื่อ ฮ → ก' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const DEFAULT_PAGE_SIZE = 50;

export default function FacultyRegistrationsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [activity, setActivity] = useState<FacultyActivityDetail | null>(null);
  const [items, setItems] = useState<FacultyRegistration[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('time_asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // confirm dialog states
  const [pendingApprove, setPendingApprove] =
    useState<FacultyRegistration | null>(null);
  const [pendingCancel, setPendingCancel] =
    useState<FacultyRegistration | null>(null);
  const [pendingEvaluate, setPendingEvaluate] =
    useState<FacultyRegistration | null>(null);
  const [pendingCheckIn, setPendingCheckIn] =
    useState<FacultyRegistration | null>(null);
  const [pendingBulkCheckIn, setPendingBulkCheckIn] =
    useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // bulk selection — checkbox ใช้ได้กับ REGISTERED (เพื่อ check-in) + ATTENDED (เพื่อประเมิน)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEvaluateResult, setBulkEvaluateResult] = useState<
    'PASSED' | 'FAILED' | null
  >(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const [actRes, regsRes] = await Promise.all([
        api.get<FacultyActivityDetail>(`/api/faculty/activities/${id}`),
        api.get<{ items: FacultyRegistration[]; can_manage: boolean }>(
          `/api/faculty/activities/${id}/registrations`,
        ),
      ]);
      setActivity(actRes.data);
      setItems(regsRes.data.items);
      setCanManage(regsRes.data.can_manage);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // 1. filter ตาม status tab
  const filteredItems = useMemo(() => {
    if (!items) return null;
    const allowed = FILTER_STATUSES[filter];
    if (!allowed) return items;
    return items.filter((r) => allowed.includes(r.registration_status));
  }, [items, filter]);

  // 2. filter ตาม search query (ชื่อ / msu_id / email — case-insensitive substring)
  const searchedItems = useMemo(() => {
    if (!filteredItems) return null;
    const q = search.trim().toLowerCase();
    if (!q) return filteredItems;
    return filteredItems.filter((r) => {
      if (r.student_name.toLowerCase().includes(q)) return true;
      if (r.msu_id && r.msu_id.toLowerCase().includes(q)) return true;
      if (r.email.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [filteredItems, search]);

  // 3. sort ตาม sortKey
  const sortedItems = useMemo(() => {
    if (!searchedItems) return null;
    const sorted = [...searchedItems];
    switch (sortKey) {
      case 'time_asc':
        sorted.sort((a, b) => a.registered_at.localeCompare(b.registered_at));
        break;
      case 'time_desc':
        sorted.sort((a, b) => b.registered_at.localeCompare(a.registered_at));
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.student_name.localeCompare(b.student_name, 'th'));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.student_name.localeCompare(a.student_name, 'th'));
        break;
    }
    return sorted;
  }, [searchedItems, sortKey]);

  // 4. paginate
  const totalPages = sortedItems
    ? Math.max(1, Math.ceil(sortedItems.length / pageSize))
    : 1;
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    if (!sortedItems) return null;
    const start = (safePage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safePage, pageSize]);

  // checkbox select-all = "เลือกทั้งหน้า" — เฉพาะที่ pageable + ใน status REGISTERED/ATTENDED
  const selectableIds = useMemo(() => {
    if (!pagedItems) return [] as number[];
    return pagedItems
      .filter(
        (r) =>
          r.registration_status === 'REGISTERED' ||
          r.registration_status === 'ATTENDED',
      )
      .map((r) => r.registration_id);
  }, [pagedItems]);

  // selectable ทุกหน้า (รวมในผลค้นหาปัจจุบัน) — ใช้สำหรับปุ่ม "เลือกทั้งหมดในผลการค้นหา"
  const allSelectableIds = useMemo(() => {
    if (!sortedItems) return [] as number[];
    return sortedItems
      .filter(
        (r) =>
          r.registration_status === 'REGISTERED' ||
          r.registration_status === 'ATTENDED',
      )
      .map((r) => r.registration_id);
  }, [sortedItems]);

  // แยก selected เป็น 2 กลุ่มตามสถานะ — กำหนดว่าจะแสดงปุ่ม action ตัวไหนได้บ้าง
  const selectedByStatus = useMemo(() => {
    if (!items) return { registered: [] as number[], attended: [] as number[] };
    const registered: number[] = [];
    const attended: number[] = [];
    for (const r of items) {
      if (!selectedIds.has(r.registration_id)) continue;
      if (r.registration_status === 'REGISTERED') registered.push(r.registration_id);
      else if (r.registration_status === 'ATTENDED')
        attended.push(r.registration_id);
    }
    return { registered, attended };
  }, [items, selectedIds]);

  // เคลียร์ selection ทุกครั้งที่ filter เปลี่ยน — กันสับสนระหว่าง tab
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  // reset page เมื่อ filter / search / sort / pageSize เปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [filter, search, sortKey, pageSize]);

  // keyboard shortcut: '/' focus search, Esc clear search/selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && isTyping && target === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleSelect(regId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = selectableIds.every((id) => prev.has(id));
      if (allSelected) {
        // ยกเลิกเฉพาะ id ที่อยู่ใน selectable (เก็บ id อื่น ๆ ไว้ — ปกติไม่มีอยู่แล้ว แต่กันไว้)
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...selectableIds]);
    });
  }

  const counts = useMemo(() => {
    if (!items) return null;
    return {
      pending: items.filter((r) => r.registration_status === 'PENDING_APPROVAL').length,
      registered: items.filter((r) => r.registration_status === 'REGISTERED').length,
      attended: items.filter((r) => r.registration_status === 'ATTENDED').length,
      cancelled: items.filter((r) =>
        FILTER_STATUSES.cancelled!.includes(r.registration_status),
      ).length,
    };
  }, [items]);

  async function executeApprove() {
    if (!pendingApprove || !id) return;
    setBusy(true);
    try {
      await api.post(
        `/api/faculty/activities/${id}/registrations/${pendingApprove.registration_id}/approve`,
      );
      toast.success(`อนุมัติ ${pendingApprove.student_name} แล้ว`);
      setPendingApprove(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'อนุมัติไม่สำเร็จ');
      setPendingApprove(null);
    } finally {
      setBusy(false);
    }
  }

  async function executeCheckIn() {
    if (!pendingCheckIn || !id) return;
    setBusy(true);
    try {
      const res = await api.post<{
        status: 'ok';
        checked_in: number[];
        skipped: number[];
      }>(`/api/faculty/activities/${id}/registrations/staff-check-in`, {
        registration_ids: [pendingCheckIn.registration_id],
      });
      if (res.data.checked_in.length > 0) {
        toast.success(`เช็คอิน ${pendingCheckIn.student_name} แล้ว`);
      } else {
        toast.error('เช็คอินไม่สำเร็จ — สถานะอาจเปลี่ยนแปลงแล้ว');
      }
      setPendingCheckIn(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'เช็คอินไม่สำเร็จ');
      setPendingCheckIn(null);
    } finally {
      setBusy(false);
    }
  }

  async function executeBulkCheckIn() {
    if (!pendingBulkCheckIn || !id || pendingBulkCheckIn.length === 0) return;
    setBusy(true);
    try {
      const res = await api.post<{
        status: 'ok';
        checked_in: number[];
        skipped: number[];
      }>(`/api/faculty/activities/${id}/registrations/staff-check-in`, {
        registration_ids: pendingBulkCheckIn,
      });
      const { checked_in, skipped } = res.data;
      if (skipped.length === 0) {
        toast.success(`เช็คอิน ${checked_in.length} คนแล้ว`);
      } else {
        toast.success(
          `เช็คอิน ${checked_in.length} คน — ข้าม ${skipped.length} (สถานะไม่ใช่ "อนุมัติแล้ว")`,
        );
      }
      setPendingBulkCheckIn(null);
      setSelectedIds(new Set());
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'เช็คอินไม่สำเร็จ');
      setPendingBulkCheckIn(null);
    } finally {
      setBusy(false);
    }
  }

  async function executeCancel() {
    if (!pendingCancel || !id) return;
    setBusy(true);
    try {
      await api.post(
        `/api/faculty/activities/${id}/registrations/${pendingCancel.registration_id}/cancel`,
      );
      toast.success(`ยกเลิก ${pendingCancel.student_name} แล้ว`);
      setPendingCancel(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ยกเลิกไม่สำเร็จ');
      setPendingCancel(null);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        <Link
          href={`/dashboard/faculty/activities/${id}`}
          className="mb-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← กลับหน้ากิจกรรม
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <Link
        href={`/dashboard/faculty/activities/${id}`}
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← กลับหน้ากิจกรรม
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ผู้สมัครเข้าร่วมกิจกรรม
          </h1>
          {activity && (
            <p className="mt-1 text-sm text-gray-500">
              {activity.title} · {activity.registered_count}/{activity.capacity} ที่นั่ง
            </p>
          )}
          {!canManage && items && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              ดูได้อย่างเดียว — ปุ่มอนุมัติ/ยกเลิก/เพิ่มรายชื่อใช้ได้เฉพาะผู้สร้างกิจกรรม
            </p>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowBulkAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            เพิ่มรายชื่อ
          </button>
        )}
      </div>

      {/* Toolbar: filter chips + search + sort */}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.value;
            let count: number | null = null;
            if (counts) {
              count =
                opt.value === 'all'
                  ? items?.length ?? 0
                  : (counts as Record<string, number>)[opt.value] ?? 0;
            }
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {opt.label}
                {count !== null && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 text-[10px] ${
                      active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่อ / รหัสนิสิต / อีเมล"
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="ล้างคำค้นหา"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {!search && (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 sm:inline-block"
              >
                /
              </kbd>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="จัดเรียง"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count + page-size */}
      {items && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <p>
            พบ <span className="font-semibold text-gray-900">{sortedItems?.length ?? 0}</span> รายการ
            {search && (
              <>
                {' '}
                จากคำค้นหา
                <span className="mx-1 rounded bg-amber-50 px-1.5 py-0.5 font-mono text-amber-800">
                  {search}
                </span>
              </>
            )}
            {' '}· ทั้งหมด {items.length}
          </p>
          <label className="flex items-center gap-1.5">
            <span>ต่อหน้า</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!items && <ListSkeleton />}

      {sortedItems && sortedItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          {search ? (
            <>
              ไม่พบรายการที่ตรงกับ "
              <span className="font-mono">{search}</span>"
              <button
                type="button"
                onClick={() => setSearch('')}
                className="ml-2 inline-block text-blue-600 hover:underline"
              >
                ล้างคำค้นหา
              </button>
            </>
          ) : (
            'ไม่มีรายการในตัวกรองนี้'
          )}
        </div>
      )}

      {/* Bulk action bar — sticky เมื่อ scroll */}
      {canManage && selectedIds.size > 0 && (
        <div className="sticky top-2 z-30 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-300 bg-blue-50/95 px-4 py-3 shadow-md backdrop-blur-sm">
          <div className="text-sm text-blue-900">
            <p className="font-semibold">เลือก {selectedIds.size} รายการ</p>
            <p className="mt-0.5 text-xs text-blue-700">
              {selectedByStatus.registered.length > 0 && (
                <span>อนุมัติแล้ว {selectedByStatus.registered.length} คน</span>
              )}
              {selectedByStatus.registered.length > 0 &&
                selectedByStatus.attended.length > 0 && <span> · </span>}
              {selectedByStatus.attended.length > 0 && (
                <span>เช็คอินแล้ว {selectedByStatus.attended.length} คน</span>
              )}
              {allSelectableIds.length > selectedIds.size && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(allSelectableIds))}
                    className="font-medium text-blue-700 underline-offset-2 hover:underline"
                  >
                    เลือกทั้งหมด {allSelectableIds.length} รายการ
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedByStatus.registered.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPendingBulkCheckIn(selectedByStatus.registered)
                }
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <QrCode className="h-3.5 w-3.5" aria-hidden />
                เช็คอิน {selectedByStatus.registered.length} คน
              </button>
            )}
            {selectedByStatus.attended.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setBulkEvaluateResult('PASSED')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  ผ่าน {selectedByStatus.attended.length} คน
                </button>
                <button
                  type="button"
                  onClick={() => setBulkEvaluateResult('FAILED')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  ไม่ผ่าน {selectedByStatus.attended.length} คน
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              ยกเลิกการเลือก
            </button>
          </div>
        </div>
      )}

      {pagedItems && pagedItems.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-sm">
                <tr>
                  {canManage && (
                    <th className="w-10 px-3 py-3 text-left">
                      {selectableIds.length > 0 && (
                        <input
                          type="checkbox"
                          aria-label="เลือกทั้งหน้า"
                          title="เลือก/ยกเลิกเลือกทั้งหน้านี้"
                          checked={
                            selectableIds.length > 0 &&
                            selectableIds.every((id) => selectedIds.has(id))
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}
                    </th>
                  )}
                  <th className="px-4 py-3 text-left">นิสิต</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">
                    คณะ
                  </th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">ผลประเมิน</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">
                    สมัครเมื่อ
                  </th>
                  <th className="px-4 py-3 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedItems.map((r) => (
                  <RegistrationRow
                    key={r.registration_id}
                    reg={r}
                    canManage={canManage}
                    busy={busy}
                    selected={selectedIds.has(r.registration_id)}
                    onToggleSelect={() => toggleSelect(r.registration_id)}
                    onApprove={() => setPendingApprove(r)}
                    onCancel={() => setPendingCancel(r)}
                    onCheckIn={() => setPendingCheckIn(r)}
                    onEvaluate={() => setPendingEvaluate(r)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {sortedItems && sortedItems.length > pageSize && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={sortedItems.length}
              pageSize={pageSize}
              onChange={setPage}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingApprove}
        title="อนุมัติให้เข้าร่วม?"
        message={
          pendingApprove && (
            <>
              อนุมัติให้ <strong>{pendingApprove.student_name}</strong>{' '}
              เข้าร่วมกิจกรรม — ระบบจะออก QR check-in ให้นิสิตทันที
            </>
          )
        }
        confirmLabel="อนุมัติ"
        loading={busy}
        onConfirm={executeApprove}
        onCancel={() => setPendingApprove(null)}
      />

      <ConfirmDialog
        open={!!pendingCancel}
        tone="danger"
        title="ยกเลิกการสมัคร?"
        message={
          pendingCancel && (
            <>
              ยกเลิกการสมัครของ <strong>{pendingCancel.student_name}</strong> —
              ที่นั่งจะถูกคืนกลับเข้า capacity
            </>
          )
        }
        confirmLabel="ยกเลิก"
        loading={busy}
        onConfirm={executeCancel}
        onCancel={() => setPendingCancel(null)}
      />

      <ConfirmDialog
        open={!!pendingCheckIn}
        title="ยืนยันการเช็คอิน?"
        message={
          pendingCheckIn && (
            <>
              บันทึกว่า <strong>{pendingCheckIn.student_name}</strong>{' '}
              เข้าร่วมกิจกรรม — ระบบจะตั้งสถานะเป็น "เช็คอินแล้ว" และรอการประเมินจากท่าน
            </>
          )
        }
        confirmLabel="เช็คอิน"
        loading={busy}
        onConfirm={executeCheckIn}
        onCancel={() => setPendingCheckIn(null)}
      />

      <ConfirmDialog
        open={!!pendingBulkCheckIn}
        title="เช็คอินหลายคน?"
        message={
          pendingBulkCheckIn && (
            <>
              บันทึกการเข้าร่วมของ{' '}
              <strong>{pendingBulkCheckIn.length} คน</strong> พร้อมกัน —
              เฉพาะรายการที่อยู่ในสถานะ "อนุมัติแล้ว" จะถูกเช็คอิน
              รายการอื่นจะถูกข้าม
            </>
          )
        }
        confirmLabel={`เช็คอิน ${pendingBulkCheckIn?.length ?? 0} คน`}
        loading={busy}
        onConfirm={executeBulkCheckIn}
        onCancel={() => setPendingBulkCheckIn(null)}
      />

      <BulkAddDialog
        open={showBulkAdd}
        activityId={Number(id)}
        onClose={() => setShowBulkAdd(false)}
        onAdded={load}
      />

      <EvaluateDialog
        open={!!pendingEvaluate}
        activityId={Number(id)}
        registration={pendingEvaluate}
        onClose={() => setPendingEvaluate(null)}
        onSaved={load}
      />

      <BulkEvaluateDialog
        open={!!bulkEvaluateResult}
        activityId={Number(id)}
        registrationIds={Array.from(selectedIds)}
        result={bulkEvaluateResult}
        onClose={() => setBulkEvaluateResult(null)}
        onSaved={() => {
          setSelectedIds(new Set());
          load();
        }}
      />
    </div>
  );
}

function RegistrationRow({
  reg,
  canManage,
  busy,
  selected,
  onToggleSelect,
  onApprove,
  onCancel,
  onCheckIn,
  onEvaluate,
}: {
  reg: FacultyRegistration;
  canManage: boolean;
  busy: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onCancel: () => void;
  onCheckIn: () => void;
  onEvaluate: () => void;
}) {
  const meta = STATUS_LABELS[reg.registration_status];
  const isPending = reg.registration_status === 'PENDING_APPROVAL';
  const isRegistered = reg.registration_status === 'REGISTERED';
  const isAttended = reg.registration_status === 'ATTENDED';
  const evalMeta = reg.evaluation_status
    ? EVALUATION_LABELS[reg.evaluation_status]
    : null;

  return (
    <tr className={`hover:bg-gray-50 ${selected ? 'bg-blue-50/40' : ''}`}>
      {canManage && (
        <td className="w-10 px-3 py-3 align-top">
          {(isRegistered || isAttended) && (
            <input
              type="checkbox"
              aria-label={`เลือก ${reg.student_name}`}
              checked={selected}
              onChange={onToggleSelect}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
        </td>
      )}
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-gray-900">{reg.student_name}</p>
        <p className="text-xs text-gray-500">
          {reg.msu_id ?? reg.email}
        </p>
        {/* คณะ + เวลา ที่ซ่อนในจอเล็ก — แสดงรวมในคอลัมน์ชื่อ */}
        <p className="mt-0.5 text-xs text-gray-400 md:hidden">
          {reg.faculty_name ?? '—'}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 lg:hidden">
          สมัคร {new Date(reg.registered_at).toLocaleDateString('th-TH')}
        </p>
      </td>
      <td className="hidden px-4 py-3 align-top text-xs text-gray-700 md:table-cell">
        {reg.faculty_name ?? '—'}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.tone}`}
        >
          {meta.th}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        {evalMeta ? (
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${evalMeta.tone}`}
            >
              {evalMeta.th}
            </span>
            {reg.evaluation_note && (
              <p
                className="mt-1 max-w-xs truncate text-xs text-gray-500"
                title={reg.evaluation_note}
              >
                {reg.evaluation_note}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="hidden px-4 py-3 align-top text-xs text-gray-600 lg:table-cell">
        {new Date(reg.registered_at).toLocaleString('th-TH')}
      </td>
      <td className="px-4 py-3 text-right align-top">
        {canManage && isPending && (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              อนุมัติ
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              ยกเลิก
            </button>
          </div>
        )}
        {canManage && isRegistered && (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onCheckIn}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              เช็คอิน
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              ยกเลิก
            </button>
          </div>
        )}
        {canManage && isAttended && (
          <button
            type="button"
            onClick={onEvaluate}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
            {reg.evaluation_status === 'PENDING_EVALUATION'
              ? 'ประเมินผล'
              : 'แก้ไขผล'}
          </button>
        )}
      </td>
    </tr>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}

// Pagination footer — Prev/Next + แสดงตำแหน่งหน้า + ตัวเลขหน้ารอบ ๆ ปัจจุบัน
function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // สร้าง array หน้าที่จะแสดง — แสดง 1, ..., current-1, current, current+1, ..., last
  const pageNumbers: (number | 'gap')[] = [];
  const push = (n: number | 'gap') => pageNumbers.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push('gap');
    const rangeStart = Math.max(2, page - 1);
    const rangeEnd = Math.min(totalPages - 1, page + 1);
    for (let i = rangeStart; i <= rangeEnd; i++) push(i);
    if (page < totalPages - 2) push('gap');
    push(totalPages);
  }

  return (
    <nav
      aria-label="หน้า"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-xs text-gray-500">
        แสดง <span className="font-semibold text-gray-900">{start}</span>
        {start !== end && (
          <>
            {' '}–<span className="font-semibold text-gray-900"> {end}</span>
          </>
        )}{' '}
        จาก <span className="font-semibold text-gray-900">{totalItems}</span>{' '}
        รายการ
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
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
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`min-w-[2rem] rounded-md px-2 py-1 text-xs font-medium ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
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
