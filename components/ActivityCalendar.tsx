'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { CalendarActivity, CalendarResponse } from '@/lib/types';
import { formatNumber, formatTime } from '@/lib/format';
import { FacultyScopeChip } from '@/components/FacultyScopeChip';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
// public axios แยก — ไม่ต้องการ bearer/refresh interceptor
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

// สีตามหมวด (ให้ตรงกับ ActivityCard: category_code 1–4)
const CATEGORY_STYLE: Record<number, { dot: string; chip: string }> = {
  1: { dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-800' },
  2: { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  3: { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  4: { dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-800' },
};
const CATEGORY_FALLBACK = { dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-700' };
const catStyle = (code: number) => CATEGORY_STYLE[code] ?? CATEGORY_FALLBACK;

const WEEKDAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']; // จันทร์นำ
const MAX_DOTS = 3; // จุดสูงสุดต่อวัน (เกินนี้เป็น +N)

// ── date helpers (อิง local time — ผู้ใช้อยู่ไทย +7) ──
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
// จันทร์ที่อยู่ ณ หรือก่อนหน้า d (จ=0 … อา=6)
const mondayOnOrBefore = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const monthTitleFmt = new Intl.DateTimeFormat('th-TH', {
  month: 'long',
  year: 'numeric',
});
const fullDateFmt = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function ActivityCalendar() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selected, setSelected] = useState<Date | null>(today);
  const [items, setItems] = useState<CalendarActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // cache ต่อเดือน (คีย์ "YYYY-M") กันโหลดซ้ำตอนเลื่อนกลับ
  const cache = useRef(new Map<string, CalendarActivity[]>());
  const seq = useRef(0);

  // ตารางวัน (grid) ของเดือนที่ดู — จันทร์นำ, จำนวนสัปดาห์ตามจริง (4–6)
  const gridDays = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const gridStart = mondayOnOrBefore(first);
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const weeks = Math.ceil((leading + daysInMonth) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  }, [view]);

  // โหลดกิจกรรมของช่วง grid (pad ±1 วันกันเหลื่อม timezone)
  useEffect(() => {
    const key = `${view.year}-${view.month}`;
    const cached = cache.current.get(key);
    if (cached) {
      setItems(cached);
      setLoading(false);
      setError(false);
      return;
    }
    const from = dayKey(addDays(gridDays[0], -1));
    const to = dayKey(addDays(gridDays[gridDays.length - 1], 2)); // exclusive
    const s = ++seq.current;
    setLoading(true);
    setError(false);
    publicApi
      .get<CalendarResponse>('/api/public/activities/calendar', {
        params: { from, to },
      })
      .then((res) => {
        if (s !== seq.current) return;
        cache.current.set(key, res.data.items);
        setItems(res.data.items);
      })
      .catch(() => {
        if (s !== seq.current) return;
        setError(true);
        setItems([]);
      })
      .finally(() => {
        if (s === seq.current) setLoading(false);
      });
  }, [view, gridDays]);

  // จัดกลุ่มกิจกรรมตามวัน (กิจกรรมข้ามวัน → โผล่ทุกวันในช่วง)
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    for (const a of items) {
      const s = startOfDay(new Date(a.start_at));
      const e = startOfDay(new Date(a.end_at));
      // กันลูปยาวผิดปกติ (ครอบคลุมไม่เกิน ~1 ปี)
      let cur = s;
      for (let i = 0; cur <= e && i < 400; i++, cur = addDays(cur, 1)) {
        const k = dayKey(cur);
        const arr = map.get(k);
        if (arr) arr.push(a);
        else map.set(k, [a]);
      }
    }
    return map;
  }, [items]);

  const goMonth = (delta: number) => {
    setSelected(null);
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(today);
  };

  const selectedList = selected ? byDay.get(dayKey(selected)) ?? [] : [];
  // legend เฉพาะหมวดที่ปรากฏในเดือนนี้
  const legend = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of items) if (!m.has(a.category_code)) m.set(a.category_code, a.category_name);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 md:text-xl">
          <CalendarDays className="h-5 w-5 text-blue-600" aria-hidden />
          ปฏิทินกิจกรรม
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="mr-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="เดือนก่อนหน้า"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-gray-900">
            {monthTitleFmt.format(new Date(view.year, view.month, 1))}
          </span>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="เดือนถัดไป"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative mt-1 grid grid-cols-7 gap-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
          </div>
        )}
        {gridDays.map((d) => {
          const inMonth = d.getMonth() === view.month;
          const isToday = d.getTime() === today.getTime();
          const isSelected = selected != null && d.getTime() === selected.getTime();
          const dayEvents = byDay.get(dayKey(d)) ?? [];
          return (
            <button
              key={dayKey(d)}
              type="button"
              onClick={() => setSelected(d)}
              className={`flex min-h-[3.5rem] flex-col items-center gap-1 rounded-lg border p-1 text-left transition md:min-h-[4.5rem] ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday
                    ? 'bg-blue-600 font-semibold text-white'
                    : inMonth
                      ? 'text-gray-700'
                      : 'text-gray-300'
                  }`}
              >
                {d.getDate()}
              </span>
              {/* จุดสีตามหมวด (+N ถ้าเกิน) */}
              {dayEvents.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {dayEvents.slice(0, MAX_DOTS).map((a, i) => (
                    <span
                      key={`${a.id}-${i}`}
                      className={`h-1.5 w-1.5 rounded-full ${catStyle(a.category_code).dot}`}
                    />
                  ))}
                  {dayEvents.length > MAX_DOTS && (
                    <span className="text-[10px] font-medium leading-none text-gray-400">
                      +{dayEvents.length - MAX_DOTS}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
          {legend.map(([code, name]) => (
            <span key={code} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${catStyle(code).dot}`} />
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Selected day panel */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4">
        {error ? (
          <p className="text-sm text-rose-600">โหลดปฏิทินไม่สำเร็จ — ลองเลือกเดือนใหม่</p>
        ) : selected == null ? (
          <p className="text-sm text-gray-500">เลือกวันที่เพื่อดูรายละเอียดกิจกรรม</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-gray-900">
              {fullDateFmt.format(selected)}
            </p>
            {selectedList.length === 0 ? (
              <p className="text-sm text-gray-500">ไม่มีกิจกรรมในวันนี้</p>
            ) : (
              <ul className="space-y-2">
                {selectedList.map((a) => {
                  const multiDay =
                    dayKey(new Date(a.start_at)) !== dayKey(new Date(a.end_at));
                  const isFull = a.registered_count >= a.capacity;
                  const remaining = Math.max(0, a.capacity - a.registered_count);
                  const regClosed =
                    Date.now() > new Date(a.registration_close_at).getTime();
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/activities/${a.id}`}
                        className="flex items-start gap-2 rounded-lg bg-white p-2.5 shadow-sm transition hover:ring-1 hover:ring-blue-300"
                      >

                        <span className="min-w-0 flex-1">

                          <span className="line-clamp-2 text-sm font-medium text-gray-900">
                            {a.title}
                          </span>


                          <span className="mt-0.5 block text-xs text-gray-500">
                            {multiDay
                              ? 'จัดหลายวัน'
                              : `${formatTime(a.start_at)} – ${formatTime(a.end_at)} น.`}
                          </span>

                          {/* scope คณะ + สถานะจำนวนรับ */}
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${catStyle(a.category_code).chip
                                }`}
                            >
                              {a.category_name}
                            </span>
                            <FacultyScopeChip faculties={a.eligible_faculties} />
                            {isFull ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                เต็มแล้ว
                              </span>
                            ) : regClosed ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                ปิดรับสมัคร
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                เหลือ {formatNumber(remaining)} ที่
                              </span>
                            )}
                            <span className="text-xs tabular-nums text-gray-400">
                              {formatNumber(a.registered_count)}/{formatNumber(a.capacity)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
