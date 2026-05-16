'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Eye,
  Heart,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatActivityRange, formatDate, formatNumber } from '@/lib/format';
import type { StudentInterestActivity } from '@/lib/types';

export default function StudentInterestsPage() {
  const [items, setItems] = useState<StudentInterestActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<{ items: StudentInterestActivity[] }>(
        '/api/student/interests',
      );
      setItems(res.data.items);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function unsave(activityId: number, title: string) {
    setRemovingId(activityId);
    try {
      await api.delete(`/api/student/interests/${activityId}`);
      toast.success(`เอา "${title}" ออกจากกิจกรรมที่สนใจแล้ว`);
      // optimistic: เอาออกจาก list ทันที
      setItems((prev) =>
        prev ? prev.filter((x) => x.activity_id !== activityId) : prev,
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" aria-hidden />
          กิจกรรมที่ฉันสนใจ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          กิจกรรมที่ท่านกด "❤️ สนใจ" ไว้ — เรียงล่าสุดก่อน
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && !error && <ListSkeleton />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          <Heart
            className="mx-auto mb-2 h-8 w-8 text-gray-300"
            aria-hidden
          />
          ยังไม่มีกิจกรรมที่ท่านกดสนใจ
          <p className="mt-2">
            <Link href="/" className="text-blue-600 hover:underline">
              ไปดูกิจกรรม →
            </Link>
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.activity_id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <Link
                  href={`/activities/${a.activity_id}`}
                  className="min-w-0 flex-1 hover:text-blue-700"
                >
                  <h3 className="mb-1 truncate text-base font-semibold text-gray-900">
                    {a.title}
                  </h3>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                      <span className="truncate">{a.location || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                      <span>
                        {formatActivityRange(a.start_at, a.end_at)} ·{' '}
                        <span className="text-gray-500">
                          เปิดรับสมัคร {formatDate(a.registration_open_at)}–
                          {formatDate(a.registration_close_at)}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3 text-gray-400" aria-hidden />
                    <span className="tabular-nums">
                      {formatNumber(a.registered_count)}/
                      {formatNumber(a.capacity)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 text-gray-400" aria-hidden />
                    <span className="tabular-nums">
                      {formatNumber(a.view_count)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-500">
                    <Heart className="h-3 w-3 fill-rose-500" aria-hidden />
                    <span className="tabular-nums">
                      {formatNumber(a.interested_count)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => unsave(a.activity_id, a.title)}
                    disabled={removingId === a.activity_id}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    title="เอาออกจากที่สนใจ"
                  >
                    <X className="h-3 w-3" aria-hidden />
                    เอาออก
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
