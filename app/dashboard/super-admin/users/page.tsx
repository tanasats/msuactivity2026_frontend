'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  Loader2,
  Mail,
  PencilLine,
  PowerOff,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/lib/store';
import type {
  AdminUserSummary,
  MasterFaculty,
  UserAuditLog,
  UserRole,
  UserStatus,
} from '@/lib/types';

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'นิสิต',
  staff: 'บุคลากร (ยังไม่ provision)',
  faculty_staff: 'เจ้าหน้าที่คณะ',
  executive: 'ผู้บริหาร',
  admin: 'ผู้ดูแลระบบ',
  super_admin: 'ผู้ดูแลระบบสูงสุด',
};

const ROLE_BADGE: Record<UserRole, string> = {
  student: 'bg-blue-50 text-blue-700',
  staff: 'bg-gray-100 text-gray-600',
  faculty_staff: 'bg-emerald-50 text-emerald-700',
  executive: 'bg-amber-50 text-amber-700',
  admin: 'bg-violet-50 text-violet-700',
  super_admin: 'bg-rose-50 text-rose-700',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const SEARCH_DEBOUNCE_MS = 300;

interface ListResponse {
  items: AdminUserSummary[];
  total: number;
  limit: number;
  offset: number;
}

type RoleFilter = UserRole | 'all';
type StatusFilter = UserStatus | 'all';
type FacultyFilter = number | 'all' | 'none';

const NUMBER_FMT = new Intl.NumberFormat('th-TH');

export default function UsersPage() {
  const meId = useAuthStore((s) => s.user?.id ?? null);

  const [items, setItems] = useState<AdminUserSummary[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // searchInput = ที่ user พิมพ์, search = ค่าที่ debounce แล้วจะส่งไป backend
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [facultyFilter, setFacultyFilter] = useState<FacultyFilter>('all');

  const [faculties, setFaculties] = useState<MasterFaculty[]>([]);

  const [editing, setEditing] = useState<AdminUserSummary | null>(null);
  const [auditing, setAuditing] = useState<AdminUserSummary | null>(null);
  const [pendingToggle, setPendingToggle] = useState<AdminUserSummary | null>(null);
  const [busy, setBusy] = useState(false);

  // โหลด faculties สำหรับ filter + dropdown ใน edit dialog (ครั้งเดียว)
  useEffect(() => {
    api
      .get<{ items: MasterFaculty[] }>('/api/faculties')
      .then((r) => setFaculties(r.data.items))
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  // debounce search input → search state
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // กัน race condition ตอน filter เปลี่ยนเร็วๆ — ignore response เก่า
  const fetchSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String(offset));
      if (search) params.set('q', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (facultyFilter === 'none') params.set('faculty_id', 'null');
      else if (facultyFilter !== 'all')
        params.set('faculty_id', String(facultyFilter));

      const res = await api.get<ListResponse>(`/api/users?${params.toString()}`);
      if (seq !== fetchSeq.current) return; // มี request ใหม่กว่ามาแซง
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (e: unknown) {
      if (seq !== fetchSeq.current) return;
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [offset, pageSize, search, roleFilter, statusFilter, facultyFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // เปลี่ยน filter/page size → reset offset (ไม่รวม offset เพราะจะวน infinite)
  useEffect(() => {
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter, facultyFilter, pageSize]);

  async function executeToggleStatus() {
    if (!pendingToggle) return;
    setBusy(true);
    try {
      const newStatus: UserStatus =
        pendingToggle.status === 'active' ? 'disabled' : 'active';
      await api.patch<AdminUserSummary>(
        `/api/users/${pendingToggle.id}/status`,
        { status: newStatus },
      );
      toast.success(
        newStatus === 'disabled'
          ? `ปิดบัญชี "${pendingToggle.full_name}" แล้ว`
          : `เปิดบัญชี "${pendingToggle.full_name}" แล้ว`,
      );
      setPendingToggle(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
      setPendingToggle(null);
    } finally {
      setBusy(false);
    }
  }

  // pagination calc
  const totalPages = total !== null && total > 0 ? Math.ceil(total / pageSize) : 0;
  const currentPage = totalPages > 0 ? Math.floor(offset / pageSize) + 1 : 1;
  const lastPageOffset = totalPages > 0 ? (totalPages - 1) * pageSize : 0;
  const fromItem = total === 0 ? 0 : offset + 1;
  const toItem = total !== null ? Math.min(offset + (items?.length ?? 0), total) : 0;

  // ── filter chips ───────────────────────────────────────────────
  const facultyById = useMemo(() => {
    const m = new Map<number, string>();
    faculties.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [faculties]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (search) {
      chips.push({
        key: 'q',
        label: `ค้นหา: "${search}"`,
        onClear: () => {
          setSearchInput('');
          setSearch('');
        },
      });
    }
    if (roleFilter !== 'all') {
      chips.push({
        key: 'role',
        label: `Role: ${ROLE_LABELS[roleFilter]}`,
        onClear: () => setRoleFilter('all'),
      });
    }
    if (facultyFilter !== 'all') {
      const name =
        facultyFilter === 'none'
          ? 'ยังไม่มีคณะ'
          : facultyById.get(facultyFilter) ?? `#${facultyFilter}`;
      chips.push({
        key: 'faculty',
        label: `คณะ: ${name}`,
        onClear: () => setFacultyFilter('all'),
      });
    }
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `สถานะ: ${statusFilter === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}`,
        onClear: () => setStatusFilter('all'),
      });
    }
    return chips;
  }, [search, roleFilter, facultyFilter, statusFilter, facultyById]);

  function clearAllFilters() {
    setSearchInput('');
    setSearch('');
    setRoleFilter('all');
    setFacultyFilter('all');
    setStatusFilter('all');
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Users className="h-6 w-6 text-violet-600" aria-hidden />
          ผู้ใช้งาน
          {total !== null && (
            <span className="ml-1 text-sm font-medium text-gray-400">
              ({NUMBER_FMT.format(total)})
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          จัดการบัญชีผู้ใช้ — เปลี่ยน role, กำหนดคณะ, ปิด/เปิดบัญชี
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
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
            placeholder="ค้นหา อีเมล / ชื่อ / รหัสนิสิต"
            aria-label="ค้นหาผู้ใช้"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-9 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          {/* แสดง spinner เล็กตอน debouncing ค้น */}
          {searchInput !== search && searchInput.length > 0 && (
            <Loader2
              className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
              aria-hidden
            />
          )}
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
              aria-label="ล้างค่าค้นหา"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="กรอง role"
        >
          <option value="all">ทุก role</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={String(facultyFilter)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'all' || v === 'none') setFacultyFilter(v);
            else setFacultyFilter(Number(v));
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="กรอง คณะ"
        >
          <option value="all">ทุกคณะ</option>
          <option value="none">ยังไม่มีคณะ</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="กรอง status"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="disabled">ปิดใช้งาน</option>
        </select>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClear}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
            >
              {c.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            ล้างทั้งหมด
          </button>
        </div>
      )}

      {/* Top pagination bar */}
      <PaginationBar
        loading={loading}
        total={total}
        fromItem={fromItem}
        toItem={toItem}
        currentPage={currentPage}
        totalPages={totalPages}
        offset={offset}
        pageSize={pageSize}
        lastPageOffset={lastPageOffset}
        onOffsetChange={setOffset}
        onPageSizeChange={setPageSize}
      />

      {/* Table region — relative สำหรับ loading overlay */}
      <div className="relative">
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            ไม่พบผู้ใช้ตามเงื่อนไข
          </div>
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-[inset_0_-1px_0_rgb(229_231_235)]">
                <tr>
                  <th className="px-4 py-3 text-left">ผู้ใช้</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">คณะ</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">เข้าใช้ล่าสุด</th>
                  <th className="px-4 py-3 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => {
                  const isMe = meId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={
                        u.status === 'active'
                          ? 'hover:bg-gray-50'
                          : 'bg-gray-50/50 opacity-60 hover:opacity-100'
                      }
                    >
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
                              decoding="async"
                              className="h-9 w-9 shrink-0 rounded-full border border-gray-200 bg-gray-100"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                              {u.full_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-gray-900">
                                {u.full_name}
                              </p>
                              {isMe && (
                                <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                  คุณ
                                </span>
                              )}
                            </div>
                            <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                              <Mail className="h-3 w-3 shrink-0" aria-hidden />
                              <span className="truncate">{u.email}</span>
                            </p>
                            {u.msu_id && (
                              <p className="truncate font-mono text-[11px] text-gray-400">
                                {u.msu_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ROLE_BADGE[u.role]
                          }`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.faculty_name ? (
                          <span className="text-gray-900">{u.faculty_name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.status === 'active' ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            ปิดใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAuditing(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            title="ดูประวัติการเปลี่ยนแปลง"
                          >
                            <History className="h-3.5 w-3.5" aria-hidden />
                            ประวัติ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <PencilLine className="h-3.5 w-3.5" aria-hidden />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingToggle(u)}
                            disabled={isMe}
                            title={isMe ? 'ห้ามแก้สถานะของตัวเอง' : undefined}
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                              u.status === 'active'
                                ? 'border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <>
                                <PowerOff className="h-3.5 w-3.5" aria-hidden />
                                ปิดบัญชี
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                เปิดบัญชี
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading overlay (เก็บข้อมูลเก่าค้างไว้ + ใส่ spinner กลาง — ไม่ flash skeleton) */}
        {loading && items && (
          <div
            className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md ring-1 ring-gray-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" aria-hidden />
              กำลังโหลด...
            </div>
          </div>
        )}
      </div>

      {/* Bottom pagination — สะดวกตอน scroll ลงมาท้ายตาราง */}
      {items && items.length > 0 && (
        <div className="mt-3">
          <PaginationBar
            loading={loading}
            total={total}
            fromItem={fromItem}
            toItem={toItem}
            currentPage={currentPage}
            totalPages={totalPages}
            offset={offset}
            pageSize={pageSize}
            lastPageOffset={lastPageOffset}
            onOffsetChange={setOffset}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {editing && (
        <EditUserDialog
          user={editing}
          isMe={meId === editing.id}
          faculties={faculties}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {auditing && (
        <AuditDialog
          user={auditing}
          onClose={() => setAuditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        tone={pendingToggle?.status === 'active' ? 'danger' : 'default'}
        title={
          pendingToggle?.status === 'active' ? 'ปิดบัญชีผู้ใช้?' : 'เปิดบัญชีผู้ใช้?'
        }
        message={
          pendingToggle && (
            <>
              {pendingToggle.status === 'active' ? 'ปิดบัญชี ' : 'เปิดบัญชี '}
              <strong>{pendingToggle.full_name}</strong>
              {' '}({pendingToggle.email})
              {pendingToggle.status === 'active' &&
                ' — ผู้ใช้จะ login ไม่ได้ และ session ที่ค้างจะถูกตัดทันที'}
            </>
          )
        }
        confirmLabel={
          pendingToggle?.status === 'active' ? 'ปิดบัญชี' : 'เปิดบัญชี'
        }
        loading={busy}
        onConfirm={executeToggleStatus}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}

// ─── Pagination bar ──────────────────────────────────────────────

function PaginationBar({
  loading,
  total,
  fromItem,
  toItem,
  currentPage,
  totalPages,
  offset,
  pageSize,
  lastPageOffset,
  onOffsetChange,
  onPageSizeChange,
}: {
  loading: boolean;
  total: number | null;
  fromItem: number;
  toItem: number;
  currentPage: number;
  totalPages: number;
  offset: number;
  pageSize: PageSize;
  lastPageOffset: number;
  onOffsetChange: (n: number) => void;
  onPageSizeChange: (n: PageSize) => void;
}) {
  const [pageInput, setPageInput] = useState('');

  function jumpToPage() {
    const p = Number(pageInput);
    if (!Number.isInteger(p) || p < 1 || p > totalPages) return;
    onOffsetChange((p - 1) * pageSize);
    setPageInput('');
  }

  const isFirst = offset === 0;
  const isLast = offset >= lastPageOffset;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
      <div className="flex items-center gap-2">
        <span>
          {total === null ? (
            'กำลังโหลด...'
          ) : total === 0 ? (
            '0 รายการ'
          ) : (
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
        <label className="ml-2 inline-flex items-center gap-1">
          <span className="text-gray-500">ต่อหน้า</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            disabled={loading}
            className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-violet-500 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

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
          onClick={() => onOffsetChange(0)}
          disabled={isFirst || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="หน้าแรก"
          title="หน้าแรก"
        >
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
          disabled={isFirst || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="ก่อนหน้า"
          title="ก่อนหน้า"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(offset + pageSize)}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="ถัดไป"
          title="ถัดไป"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(lastPageOffset)}
          disabled={isLast || loading}
          className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="หน้าสุดท้าย"
          title="หน้าสุดท้าย"
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
              onKeyDown={(e) => e.key === 'Enter' && jumpToPage()}
              placeholder="ไป#"
              aria-label="ไปยังหน้า"
              className="w-14 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={jumpToPage}
              disabled={!pageInput || loading}
              className="rounded-md border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40"
            >
              ไป
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit dialog: role + faculty ─────────────────────────────────

function EditUserDialog({
  user,
  isMe,
  faculties,
  onClose,
  onSaved,
}: {
  user: AdminUserSummary;
  isMe: boolean;
  faculties: MasterFaculty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [facultyId, setFacultyId] = useState<number | null>(user.faculty_id);
  const [saving, setSaving] = useState(false);

  const roleChanged = role !== user.role;
  const facultyChanged = facultyId !== user.faculty_id;

  async function save() {
    setSaving(true);
    try {
      // ส่งทีละ endpoint ตาม field ที่เปลี่ยนจริง — backend log audit แยก action
      if (roleChanged) {
        await api.patch(`/api/users/${user.id}/role`, { role });
      }
      if (facultyChanged) {
        await api.patch(`/api/users/${user.id}/faculty`, {
          faculty_id: facultyId,
        });
      }
      toast.success(`บันทึก "${user.full_name}" แล้ว`);
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const activeFaculties = faculties.filter(
    (f) => f.is_active || f.id === user.faculty_id,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-violet-600" aria-hidden />
            แก้ไขผู้ใช้
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {user.full_name} · {user.email}
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role {isMe && <span className="text-xs text-rose-600">(ห้ามแก้ของตัวเอง)</span>}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={saving || isMe}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              staff = บัญชีตั้งต้นของบุคลากร — ยังไม่มีสิทธิ์ใช้งาน
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              คณะ
            </label>
            <select
              value={facultyId === null ? '' : String(facultyId)}
              onChange={(e) => {
                const v = e.target.value;
                setFacultyId(v === '' ? null : Number(v));
              }}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              <option value="">— ไม่ระบุ —</option>
              {activeFaculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {!f.is_active ? ' (ปิดใช้งาน)' : ''}
                </option>
              ))}
            </select>
            {user.erp_faculty_name && (
              <p className="mt-1 text-xs text-gray-500">
                ERP บอกว่า: {user.erp_faculty_name}
                {user.erp_department_name && ` / ${user.erp_department_name}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || (!roleChanged && !facultyChanged)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Audit dialog ────────────────────────────────────────────────

function AuditDialog({
  user,
  onClose,
}: {
  user: AdminUserSummary;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<UserAuditLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: UserAuditLog[] }>(`/api/users/${user.id}/audit`)
      .then((r) => setLogs(r.data.items))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดไม่สำเร็จ');
      });
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <History className="h-5 w-5 text-violet-600" aria-hidden />
              ประวัติการเปลี่ยนแปลง
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {user.full_name} · {user.email}
            </p>
          </div>
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
          {!logs && !error && (
            <p className="text-sm text-gray-500">กำลังโหลด...</p>
          )}
          {logs && logs.length === 0 && (
            <p className="text-sm text-gray-500">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
          )}
          {logs && logs.length > 0 && (
            <ol className="space-y-3">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {actionLabel(l.action)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(l.created_at).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    โดย {l.actor_name} ({l.actor_email})
                  </p>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                    <ChangeBlock label="ก่อน" value={l.before} />
                    <ChangeBlock label="หลัง" value={l.after} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function actionLabel(action: UserAuditLog['action']) {
  switch (action) {
    case 'role_change':
      return 'เปลี่ยน role';
    case 'faculty_change':
      return 'เปลี่ยนคณะ';
    case 'status_change':
      return 'เปลี่ยนสถานะ';
    default:
      return action;
  }
}

function ChangeBlock({
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

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
