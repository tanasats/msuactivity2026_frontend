'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Loader2,
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { AdminCertificateRequest, CertificateStatus } from '@/lib/types';

const PAGE_SIZE = 50;
const NUMBER_FMT = new Intl.NumberFormat('th-TH');

const STATUS_LABEL: Record<CertificateStatus, { text: string; tone: string }> = {
  REQUESTED: { text: 'รอตรวจสอบ', tone: 'bg-amber-100 text-amber-800' },
  APPROVED:  { text: 'อนุมัติแล้ว', tone: 'bg-blue-100 text-blue-800' },
  REJECTED:  { text: 'ไม่อนุมัติ',  tone: 'bg-rose-100 text-rose-800' },
  ISSUED:    { text: 'ออกแล้ว',     tone: 'bg-emerald-100 text-emerald-800' },
};

const STATUS_FILTER_OPTIONS: { value: CertificateStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'ทั้งหมด' },
  { value: 'REQUESTED', label: 'รอตรวจสอบ' },
  { value: 'APPROVED',  label: 'อนุมัติแล้ว' },
  { value: 'ISSUED',    label: 'ออกแล้ว' },
  { value: 'REJECTED',  label: 'ไม่อนุมัติ' },
];

export default function AdminCertificatesPage() {
  const [items, setItems] = useState<AdminCertificateRequest[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | 'all'>('all');

  // dialog states — แยกตาม action
  const [pendingApprove, setPendingApprove] = useState<AdminCertificateRequest | null>(null);
  const [pendingReject, setPendingReject] = useState<AdminCertificateRequest | null>(null);
  const [pendingIssue, setPendingIssue] = useState<AdminCertificateRequest | null>(null);
  const [busy, setBusy] = useState(false);

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
      if (search) params.set('q', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api.get<{
        items: AdminCertificateRequest[];
        total: number;
      }>(`/api/admin/certificates?${params}`);
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
  }, [offset, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // filter change → reset offset
  useEffect(() => {
    setOffset(0);
  }, [search, statusFilter]);

  const totalPages = total && total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
  const currentPage = totalPages > 0 ? Math.floor(offset / PAGE_SIZE) + 1 : 1;
  const lastPageOffset = totalPages > 0 ? (totalPages - 1) * PAGE_SIZE : 0;
  const fromItem = total === 0 ? 0 : offset + 1;
  const toItem = total !== null ? Math.min(offset + (items?.length ?? 0), total) : 0;

  async function executeApprove() {
    if (!pendingApprove) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/certificates/${pendingApprove.id}/approve`);
      toast.success('อนุมัติคำขอเรียบร้อย');
      setPendingApprove(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'อนุมัติไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Award className="h-6 w-6 text-indigo-600" aria-hidden />
            คำขอ Transcript กิจกรรม
            {total !== null && (
              <span className="ml-1 text-sm font-medium text-gray-400">
                ({NUMBER_FMT.format(total)})
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการคำขอจากนิสิต — อนุมัติ / ปฏิเสธ / ออกใบรับรอง
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา ชื่อนิสิต / รหัสนิสิต / อีเมล"
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

        {/* Status filter — chips */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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
        onFirst={() => setOffset(0)}
        onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        onNext={() => setOffset(offset + PAGE_SIZE)}
        onLast={() => setOffset(lastPageOffset)}
      />

      <div className="relative mt-2">
        {!items && !error && <ListSkeleton />}
        {items && items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            ไม่พบคำขอตามเงื่อนไข
          </div>
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">นิสิต</th>
                  <th className="px-3 py-3 text-left">วันที่ขอ</th>
                  <th className="px-3 py-3 text-left">สถานะ</th>
                  <th className="px-3 py-3 text-right">ชม.</th>
                  <th className="px-3 py-3 text-left">เลขที่เอกสาร</th>
                  <th className="px-3 py-3 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => {
                  const lbl = STATUS_LABEL[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{r.user_full_name}</p>
                        <p className="text-xs text-gray-500">
                          {r.user_msu_id && <span className="font-mono">{r.user_msu_id}</span>}
                          {r.user_faculty_name && (
                            <span className="ml-2 text-gray-400">· {r.user_faculty_name}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {formatDateTime(r.requested_at)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lbl.tone}`}>
                          {lbl.text}
                        </span>
                        {r.status === 'REJECTED' && r.rejected_reason && (
                          <p className="mt-0.5 text-xs text-rose-700 line-clamp-2">
                            {r.rejected_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(r.total_hours_at_request)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">
                        {r.document_no ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            href={`/dashboard/admin/transcripts/${r.user_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            title="ดู / ออกทรานสคริปต์กิจกรรมของนิสิตคนนี้"
                          >
                            <ScrollText className="h-3 w-3" aria-hidden />
                            ทรานสคริปต์
                          </Link>
                          {r.status === 'REQUESTED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPendingApprove(r)}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                title="อนุมัติคำขอ"
                              >
                                <CheckCircle2 className="h-3 w-3" aria-hidden />
                                อนุมัติ
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingReject(r)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                title="ปฏิเสธคำขอ"
                              >
                                <Ban className="h-3 w-3" aria-hidden />
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                          {r.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => setPendingIssue(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                              title="ออกใบรับรอง"
                            >
                              <FileText className="h-3 w-3" aria-hidden />
                              ออกใบรับรอง
                            </button>
                          )}
                        </div>
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

      {/* Dialogs */}
      <ApproveDialog
        request={pendingApprove}
        busy={busy}
        onConfirm={executeApprove}
        onCancel={() => setPendingApprove(null)}
      />
      <RejectDialog
        request={pendingReject}
        onClose={() => setPendingReject(null)}
        onDone={async () => {
          setPendingReject(null);
          await load();
        }}
      />
      <IssueDialog
        request={pendingIssue}
        onClose={() => setPendingIssue(null)}
        onDone={async () => {
          setPendingIssue(null);
          await load();
        }}
      />
    </div>
  );
}

// ── Approve dialog (confirm only — no extra input) ────────────────
function ApproveDialog({
  request,
  busy,
  onConfirm,
  onCancel,
}: {
  request: AdminCertificateRequest | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-1 text-base font-semibold text-gray-900">
          อนุมัติคำขอ Transcript?
        </h3>
        <p className="mb-1 text-sm text-gray-600">
          นิสิต: <strong>{request.user_full_name}</strong>
        </p>
        <p className="mb-4 text-xs text-gray-500">
          อนุมัติแล้วจะรอ admin ออกใบรับรอง (ขั้นถัดไป)
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject dialog (with reason input) ─────────────────────────────
function RejectDialog({
  request,
  onClose,
  onDone,
}: {
  request: AdminCertificateRequest | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (request) setReason('');
  }, [request]);
  if (!request) return null;

  async function submit() {
    if (!request) return;
    if (!reason.trim()) {
      toast.error('โปรดระบุเหตุผล');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/certificates/${request.id}/reject`, {
        reason: reason.trim(),
      });
      toast.success('ปฏิเสธคำขอแล้ว');
      await onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ปฏิเสธไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-1 text-base font-semibold text-gray-900">ปฏิเสธคำขอ Transcript</h3>
        <p className="mb-3 text-sm text-gray-600">
          นิสิต: <strong>{request.user_full_name}</strong>
        </p>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          เหตุผล <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          rows={4}
          disabled={busy}
          placeholder="เช่น ตรวจสอบแล้วบางกิจกรรมไม่ถูกต้อง"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{reason.length}/1000</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'กำลังปฏิเสธ...' : 'ปฏิเสธคำขอ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Issue dialog (document_no + optional storage_key) ─────────────
function IssueDialog({
  request,
  onClose,
  onDone,
}: {
  request: AdminCertificateRequest | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [docNo, setDocNo] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (request) {
      setDocNo('');
      setStorageKey('');
    }
  }, [request]);
  if (!request) return null;

  async function submit() {
    if (!request) return;
    if (!docNo.trim()) {
      toast.error('โปรดระบุเลขที่เอกสาร');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/certificates/${request.id}/issue`, {
        document_no: docNo.trim(),
        pdf_storage_key: storageKey.trim() || undefined,
      });
      toast.success('ออกใบรับรองเรียบร้อย');
      await onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ออกใบรับรองไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-1 text-base font-semibold text-gray-900">ออกใบรับรอง</h3>
        <p className="mb-3 text-sm text-gray-600">
          นิสิต: <strong>{request.user_full_name}</strong>
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-700">
          เลขที่เอกสาร <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={docNo}
          onChange={(e) => setDocNo(e.target.value)}
          maxLength={100}
          disabled={busy}
          placeholder="เช่น TRC-001/2569"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p className="mb-3 mt-1 text-xs text-gray-400">
          ต้องไม่ซ้ำกับเอกสารที่ออกไปแล้ว
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-700">
          Storage key ของไฟล์ PDF <span className="text-gray-400">(ถ้ามี)</span>
        </label>
        <input
          type="text"
          value={storageKey}
          onChange={(e) => setStorageKey(e.target.value)}
          maxLength={500}
          disabled={busy}
          placeholder="certs/.../...pdf"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p className="mt-1 text-xs text-gray-400">
          ปล่อยว่างไว้ได้ — admin สามารถ upload PDF ในระบบอื่นแล้วใส่ key ภายหลัง
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !docNo.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'ออกใบรับรอง'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination + skeleton (reused pattern) ────────────────────────
function PaginationBar({
  loading,
  total,
  fromItem,
  toItem,
  currentPage,
  totalPages,
  isFirst,
  isLast,
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
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}) {
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
        <button type="button" onClick={onFirst} disabled={isFirst || loading} className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" onClick={onPrev} disabled={isFirst || loading} className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" onClick={onNext} disabled={isLast || loading} className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" onClick={onLast} disabled={isLast || loading} className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white" />
      ))}
    </div>
  );
}
