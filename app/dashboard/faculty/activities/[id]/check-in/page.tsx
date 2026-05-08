'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Camera,
  CheckCircle2,
  Clipboard,
  QrCode,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { FacultyActivityDetail } from '@/lib/types';
import { formatActivityRange } from '@/lib/format';

type Mode = 'camera' | 'manual';

interface LogEntry {
  ts: number;
  ok: boolean;
  message: string;
  studentName?: string;
}

interface ScanSuccess {
  status: 'ok';
  student: { name: string; msu_id: string | null };
  activity: { id: number; title: string };
  attendance: { id: number; checked_in_at: string };
}

const SCANNER_ELEMENT_ID = 'check-in-scanner';

export default function FacultyCheckInScanPage() {
  const params = useParams<{ id: string }>();
  const activityId = params?.id;

  const [activity, setActivity] = useState<FacultyActivityDetail | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('camera');
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  // เรียก backend ด้วย qr_token หนึ่งครั้ง
  async function submitToken(qrToken: string) {
    if (!activityId || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post<ScanSuccess>(
        `/api/faculty/activities/${activityId}/check-in`,
        { qr_token: qrToken },
      );
      const studentName = res.data.student.name;
      toast.success(`เช็คอินสำเร็จ — ${studentName}`);
      setLog((prev) =>
        [
          { ts: Date.now(), ok: true, studentName, message: 'เช็คอินสำเร็จ' },
          ...prev,
        ].slice(0, 10),
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message ?? 'เช็คอินไม่สำเร็จ';
      toast.error(message);
      setLog((prev) =>
        [{ ts: Date.now(), ok: false, message }, ...prev].slice(0, 10),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // โหลดข้อมูล activity (header)
  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    api
      .get<FacultyActivityDetail>(`/api/faculty/activities/${activityId}`)
      .then((res) => {
        if (!cancelled) setActivity(res.data);
      })
      .catch((e) => {
        if (cancelled) return;
        const message =
          e.response?.data?.message ?? 'โหลดข้อมูลกิจกรรมไม่สำเร็จ';
        setActivityError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <Link
        href={`/dashboard/faculty/activities/${activityId}`}
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← กลับหน้ากิจกรรม
      </Link>

      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-indigo-600" aria-hidden />
          <h1 className="text-xl font-bold text-gray-900">หน้าสแกน Check-in</h1>
        </div>
        {activityError && (
          <p className="text-sm text-rose-700">{activityError}</p>
        )}
        {activity && (
          <>
            <p className="text-base font-medium text-gray-900">
              {activity.title}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {activity.location} · {formatActivityRange(activity.start_at, activity.end_at)}
            </p>
            {(activity.check_in_opens_at || activity.check_in_closes_at) && (
              <p className="mt-1 text-xs text-gray-500">
                ช่วงสแกน: {activity.check_in_opens_at ?? '—'} ถึง{' '}
                {activity.check_in_closes_at ?? '—'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Mode toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setMode('camera')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === 'camera'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Camera className="h-4 w-4" aria-hidden />
          กล้องสแกน
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === 'manual'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Clipboard className="h-4 w-4" aria-hidden />
          พิมพ์/วางรหัส
        </button>
      </div>

      {/* Scan area */}
      {mode === 'camera' && (
        <CameraScanner
          onResult={(token) => submitToken(token)}
          disabled={submitting}
        />
      )}
      {mode === 'manual' && (
        <ManualEntry
          value={manualToken}
          onChange={setManualToken}
          submitting={submitting}
          onSubmit={() => {
            if (manualToken.trim()) {
              submitToken(manualToken.trim());
              setManualToken('');
            }
          }}
        />
      )}

      {/* Log */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          ประวัติการสแกนล่าสุด
        </h2>
        {log.length === 0 ? (
          <p className="text-xs text-gray-400">ยังไม่มีการสแกน</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {log.map((entry) => (
              <li
                key={entry.ts}
                className="flex items-center gap-2 border-b border-gray-50 pb-1.5 last:border-0"
              >
                {entry.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                )}
                <span className="flex-1 truncate">
                  {entry.studentName && (
                    <span className="font-medium">{entry.studentName}</span>
                  )}
                  {entry.studentName && ' · '}
                  <span
                    className={entry.ok ? 'text-gray-600' : 'text-rose-700'}
                  >
                    {entry.message}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(entry.ts).toLocaleTimeString('th-TH')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Camera Scanner ────────────────────────────────────────────────
function CameraScanner({
  onResult,
  disabled,
}: {
  onResult: (token: string) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const lastTokenRef = useRef<{ token: string; ts: number } | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let cleanup: (() => Promise<void>) | null = null;
    let cancelled = false;

    (async () => {
      try {
        // dynamic import เพื่อให้ ssr ไม่ touch (browser-only lib)
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        cleanup = async () => {
          try {
            await scanner.stop();
            await scanner.clear();
          } catch {
            /* ignore — alreadry stopped */
          }
        };

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            // dedup: ห้ามส่ง token เดิมซ้ำภายใน 5 วินาที
            const now = Date.now();
            const last = lastTokenRef.current;
            if (last && last.token === decoded && now - last.ts < 5000) return;
            lastTokenRef.current = { token: decoded, ts: now };
            onResultRef.current(decoded);
          },
          () => { /* swallow per-frame decode errors */ },
        );
      } catch (e) {
        console.error(e);
        if (!cancelled)
          setError(
            'ไม่สามารถเปิดกล้องได้ — โปรดอนุญาตการเข้าถึงกล้อง หรือใช้โหมด "พิมพ์/วางรหัส"',
          );
      }
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div
        id={SCANNER_ELEMENT_ID}
        className="overflow-hidden rounded-xl bg-black"
        style={{ minHeight: 320 }}
      />
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {!error && (
        <p className="mt-2 text-xs text-gray-500">
          วาง QR ในกรอบกล้อง ระบบจะตรวจอัตโนมัติ
          {disabled && ' · กำลังบันทึก...'}
        </p>
      )}
    </div>
  );
}

// ── Manual Entry ──────────────────────────────────────────────────
function ManualEntry({
  value,
  onChange,
  submitting,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <label className="mb-2 block text-sm font-medium text-gray-700">
        QR Token (UUID)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={submitting || !value.trim()}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? 'กำลังบันทึก...' : 'ตรวจสอบ + บันทึก'}
      </button>
    </form>
  );
}
