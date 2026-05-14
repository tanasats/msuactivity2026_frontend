'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  History,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type {
  MasterDataAuditAction,
  MasterDataAuditEntry,
  MasterDataAuditTarget,
} from '@/lib/types';

const TARGET_LABEL: Record<MasterDataAuditTarget, string> = {
  organization: 'องค์กรจัดกิจกรรม',
  category: 'ประเภทกิจกรรม',
  skill: 'ทักษะ',
  faculty: 'คณะ/หน่วยงาน',
  system_setting: 'ตั้งค่าระบบ',
  announcement: 'ประกาศเว็บไซต์',
};

const TARGET_TONE: Record<MasterDataAuditTarget, string> = {
  organization: 'bg-blue-100 text-blue-800',
  category: 'bg-emerald-100 text-emerald-800',
  skill: 'bg-violet-100 text-violet-800',
  faculty: 'bg-indigo-100 text-indigo-800',
  system_setting: 'bg-amber-100 text-amber-800',
  announcement: 'bg-rose-100 text-rose-800',
};

const ACTION_LABEL: Record<MasterDataAuditAction, { text: string; tone: string }> = {
  create: { text: 'สร้าง', tone: 'bg-emerald-50 text-emerald-700' },
  update: { text: 'แก้ไข', tone: 'bg-indigo-50 text-indigo-700' },
  soft_delete: { text: 'ปิดใช้งาน', tone: 'bg-amber-50 text-amber-700' },
  restore: { text: 'เปิดใช้งานใหม่', tone: 'bg-emerald-50 text-emerald-700' },
  delete: { text: 'ลบถาวร', tone: 'bg-rose-50 text-rose-700' },
};

const PAGE_SIZE = 50;

export default function MasterDataAuditPage() {
  const [items, setItems] = useState<MasterDataAuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // filters
  const [targetType, setTargetType] = useState<MasterDataAuditTarget | ''>('');
  const [action, setAction] = useState<MasterDataAuditAction | ''>('');
  const [keyQuery, setKeyQuery] = useState('');
  // expanded rows (show before/after JSON)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // reset page เมื่อ filter เปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [targetType, action, keyQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (targetType) params.set('target_type', targetType);
    if (action) params.set('action', action);
    if (keyQuery.trim()) params.set('target_key', keyQuery.trim());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));

    api
      .get<{
        items: MasterDataAuditEntry[];
        total: number;
        limit: number;
        offset: number;
      }>(`/api/admin/master-data-audit?${params}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetType, action, keyQuery, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setTargetType('');
    setAction('');
    setKeyQuery('');
  }

  const hasFilter = useMemo(
    () => !!(targetType || action || keyQuery.trim()),
    [targetType, action, keyQuery],
  );

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <History className="h-6 w-6 text-violet-600" aria-hidden />
          Audit log (master data)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          ประวัติการเปลี่ยน master data + system settings + ประกาศ
          โดย super_admin
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={keyQuery}
            onChange={(e) => setKeyQuery(e.target.value)}
            placeholder="ค้นด้วย target_key (เช่น S1, 2569/S1/K1, check_in.default_window_before_minutes)"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm shadow-sm placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          {keyQuery && (
            <button
              type="button"
              onClick={() => setKeyQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
              aria-label="ล้าง"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={targetType}
          onChange={(e) =>
            setTargetType(e.target.value as MasterDataAuditTarget | '')
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="ประเภทข้อมูล"
        >
          <option value="">ทุกประเภทข้อมูล</option>
          {Object.entries(TARGET_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) =>
            setAction(e.target.value as MasterDataAuditAction | '')
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="การกระทำ"
        >
          <option value="">ทุกการกระทำ</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v.text}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Result count */}
      {items && (
        <p className="mb-2 text-xs text-gray-500">
          พบ{' '}
          <span className="font-semibold text-gray-900">
            {formatNumber(total)}
          </span>{' '}
          รายการ
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && !error && <ListSkeleton />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          ไม่พบรายการตามตัวกรองนี้
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div
            className={`overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm ${
              loading ? 'opacity-60' : ''
            }`}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">เวลา</th>
                  <th className="px-4 py-3 text-left">ผู้กระทำ</th>
                  <th className="px-4 py-3 text-left">ประเภทข้อมูล</th>
                  <th className="px-4 py-3 text-left">รหัส/คีย์</th>
                  <th className="px-4 py-3 text-left">การกระทำ</th>
                  <th className="px-4 py-3 text-right">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((e) => {
                  const isOpen = expanded.has(e.id);
                  const targetMeta = TARGET_LABEL[e.target_type];
                  const targetTone = TARGET_TONE[e.target_type];
                  const actionMeta = ACTION_LABEL[e.action];
                  return (
                    <>
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 align-top text-xs text-gray-600">
                          {new Date(e.created_at).toLocaleString('th-TH')}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-gray-900">
                            {e.actor_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.actor_email}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${targetTone}`}
                          >
                            {targetMeta}
                          </span>
                          {e.note && (
                            <p className="mt-1 text-[10px] text-gray-500">
                              {e.note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {e.target_key ? (
                            <span className="font-mono text-xs text-gray-700">
                              {e.target_key}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              #{e.target_id ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionMeta.tone}`}
                          >
                            {actionMeta.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(e.id)}
                            disabled={!e.before && !e.after}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isOpen ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                                ย่อ
                              </>
                            ) : (
                              <>
                                <ChevronDown
                                  className="h-3.5 w-3.5"
                                  aria-hidden
                                />
                                ดู diff
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${e.id}-diff`} className="bg-gray-50/60">
                          <td colSpan={6} className="px-4 py-3">
                            <DiffView before={e.before} after={e.after} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function DiffView({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  // รวมคีย์ทั้งหมดที่อยู่ใน before/after — เพื่อแสดงทีละบรรทัด
  const keys = useMemo(() => {
    const s = new Set<string>();
    if (before) Object.keys(before).forEach((k) => s.add(k));
    if (after) Object.keys(after).forEach((k) => s.add(k));
    return [...s];
  }, [before, after]);

  if (keys.length === 0) {
    return <p className="text-xs text-gray-500">ไม่มีข้อมูล diff</p>;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="px-2 py-1 text-left font-medium">field</th>
            <th className="px-2 py-1 text-left font-medium">ก่อน</th>
            <th className="px-2 py-1 text-left font-medium">หลัง</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-b border-gray-50 last:border-b-0">
              <td className="px-2 py-1 align-top text-gray-700">{k}</td>
              <td className="px-2 py-1 align-top text-rose-700">
                {formatValue(before?.[k])}
              </td>
              <td className="px-2 py-1 align-top text-emerald-700">
                {formatValue(after?.[k])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'string') return v.length === 0 ? '""' : v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
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

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <nav
      aria-label="หน้า"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-xs text-gray-500">
        แสดง <span className="font-semibold text-gray-900">{start}</span> –{' '}
        <span className="font-semibold text-gray-900">{end}</span> จาก{' '}
        <span className="font-semibold text-gray-900">{total}</span> รายการ
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
        <span className="px-2 text-xs tabular-nums text-gray-700">
          หน้า {page} / {totalPages}
        </span>
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
