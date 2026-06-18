'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type {
  EligibleStudent,
  EligibleStudentsResponse,
  MasterFaculty,
} from '@/lib/types';

const PAGE_SIZE = 50;

// label ของสถานะคำขอ transcript ล่าสุด (ถ้ามี)
const CERT_STATUS: Record<string, { text: string; tone: string }> = {
  REQUESTED: { text: 'รอตรวจสอบ', tone: 'bg-amber-100 text-amber-800' },
  APPROVED: { text: 'อนุมัติแล้ว', tone: 'bg-blue-100 text-blue-800' },
  REJECTED: { text: 'ปฏิเสธ', tone: 'bg-rose-100 text-rose-700' },
  ISSUED: { text: 'ออกแล้ว', tone: 'bg-emerald-100 text-emerald-800' },
};

export default function AdminTranscriptsPage() {
  const [data, setData] = useState<EligibleStudentsResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [facultyId, setFacultyId] = useState<number | 'all'>('all');

  const [faculties, setFaculties] = useState<MasterFaculty[]>([]);
  useEffect(() => {
    api
      .get<{ items: MasterFaculty[] }>('/api/faculties')
      .then((r) => setFaculties(r.data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const s = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      if (search) params.set('q', search);
      if (facultyId !== 'all') params.set('faculty_id', String(facultyId));
      const res = await api.get<EligibleStudentsResponse>(
        `/api/admin/students/eligible?${params.toString()}`,
      );
      if (s !== seq.current) return;
      setData(res.data);
    } catch (e: unknown) {
      if (s !== seq.current) return;
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [offset, search, facultyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [search, facultyId]);

  const total = data?.total ?? null;
  const items = data?.items ?? null;
  const rule = data?.rule;
  const isFirst = offset === 0;
  const isLast = total !== null && offset + PAGE_SIZE >= total;

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FileText className="h-6 w-6 text-indigo-600" aria-hidden />
          ทรานสคริปต์กิจกรรม
          {total !== null && (
            <span className="ml-1 text-sm font-medium text-gray-400">
              ครบเกณฑ์ {formatNumber(total)} คน
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          รายชื่อนิสิตที่เข้าร่วมกิจกรรม<strong>ครบตามเกณฑ์</strong> · คลิกเพื่อดู/ออกทรานสคริปต์
        </p>
        {rule && (
          <p className="mt-1 text-xs text-gray-400">
            เกณฑ์ปัจจุบัน: กลุ่ม {rule.group_a_prefixes.join('/')} ≥{' '}
            {rule.group_a_min_activities} กิจกรรม · กลุ่ม {rule.group_b_prefixes.join('/')} ≥{' '}
            {rule.group_b_min_activities} กิจกรรม · รวม ≥ {rule.min_total_hours} ชม.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 grid gap-2 md:grid-cols-12">
        <div className="relative md:col-span-6">
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
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm md:col-span-6 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="กรอง คณะ"
        >
          <option value="">ทุกคณะ</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mt-2">
        {!items && !error && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}
        {items && items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            ไม่พบนิสิตที่ครบเกณฑ์ตามเงื่อนไข
          </div>
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">นิสิต</th>
                  <th className="px-4 py-3 text-left">คณะ</th>
                  <th className="px-4 py-3 text-right">กลุ่ม A</th>
                  <th className="px-4 py-3 text-right">กลุ่ม B</th>
                  <th className="px-4 py-3 text-right">ชั่วโมงรวม</th>
                  <th className="px-4 py-3 text-left">คำขอล่าสุด</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => (
                  <Row key={u.id} u={u} />
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

      {/* Pagination */}
      {total !== null && total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
          <span>
            {formatNumber(offset + 1)}–{formatNumber(Math.min(offset + PAGE_SIZE, total))}{' '}
            จาก {formatNumber(total)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={isFirst || loading}
              className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={isLast || loading}
              className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              aria-label="ถัดไป"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ u }: { u: EligibleStudent }) {
  const cert = u.latest_cert_status ? CERT_STATUS[u.latest_cert_status] : null;
  return (
    <tr className="hover:bg-gray-50">
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
            <p className="truncate font-medium text-gray-900">{u.full_name}</p>
            {u.msu_id && (
              <p className="truncate font-mono text-[11px] text-gray-500">{u.msu_id}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-700">
        {u.faculty_name ?? <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        {formatNumber(u.group_a_count)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        {formatNumber(u.group_b_count)}
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
        {formatNumber(u.total_hours)}
      </td>
      <td className="px-4 py-3">
        {cert ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cert.tone}`}>
            {cert.text}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/dashboard/admin/transcripts/${u.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
        >
          <FileText className="h-3 w-3" aria-hidden />
          ทรานสคริปต์
        </Link>
      </td>
    </tr>
  );
}
