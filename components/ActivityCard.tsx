import Link from 'next/link';
import { Calendar, Eye, Heart, ImageOff, MapPin } from 'lucide-react';
import type { ActivitySummary } from '@/lib/types';
import { formatActivityRange, formatDate, formatNumber } from '@/lib/format';

const CATEGORY_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-emerald-100 text-emerald-800',
  3: 'bg-amber-100 text-amber-800',
  4: 'bg-purple-100 text-purple-800',
};

interface Props {
  activity: ActivitySummary;
  variant?: 'open' | 'upcoming';
}

export function ActivityCard({ activity, variant = 'open' }: Props) {
  const filledRatio = Math.min(activity.registered_count / activity.capacity, 1);
  const isFull = activity.registered_count >= activity.capacity;
  const categoryColor =
    CATEGORY_COLORS[activity.category_code] ?? 'bg-gray-100 text-gray-700';

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow-md"
    >
      {/* Poster — aspect 16:9, fallback ถ้าไม่มี */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {activity.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activity.poster_url}
            alt={activity.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
            <ImageOff className="h-8 w-8" aria-hidden />
            <span className="text-xs">ไม่มีโปสเตอร์</span>
          </div>
        )}
        {variant === 'upcoming' && (
          <span className="absolute right-2 top-2 rounded-full bg-indigo-600/90 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
            กำลังจะมา
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
            {activity.category_name}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {activity.hours} ชม.
          </span>
          {activity.loan_hours > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              กยศ {activity.loan_hours} ชม.
            </span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-700">
          {activity.title}
        </h3>

        <div className="mb-1 flex items-start gap-1.5 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="line-clamp-1">{activity.location || '—'}</span>
        </div>
        <div className="mb-3 flex items-start gap-1.5 text-sm text-gray-600">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="line-clamp-1">
            {formatActivityRange(activity.start_at, activity.end_at)}
          </span>
        </div>

        {/* Interest stats (view + interested) — แสดงเฉพาะตอนมี data */}
        {(activity.view_count !== undefined ||
          activity.interested_count !== undefined) && (
          <div className="mb-2 flex gap-3 text-xs text-gray-500">
            {activity.view_count !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-gray-400" aria-hidden />
                <span className="tabular-nums">
                  {formatNumber(activity.view_count)}
                </span>
              </span>
            )}
            {(activity.interested_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-500">
                <Heart className="h-3 w-3 fill-rose-500" aria-hidden />
                <span className="tabular-nums">
                  {formatNumber(activity.interested_count ?? 0)}
                </span>
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3">
          {variant === 'open' ? (
            <>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-500">
                  ปิดรับสมัคร {formatDate(activity.registration_close_at)}
                </span>
                <span
                  className={`font-medium ${isFull ? 'text-rose-700' : 'text-gray-900'}`}
                >
                  {formatNumber(activity.registered_count)}/
                  {formatNumber(activity.capacity)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full ${isFull ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${filledRatio * 100}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">
              เปิดรับสมัคร {formatDate(activity.registration_open_at)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
