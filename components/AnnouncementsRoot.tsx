'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Megaphone,
  X,
} from 'lucide-react';
import type {
  AnnouncementSeverity,
  PublicAnnouncement,
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ใช้ axios แยก instance — public endpoint ไม่ต้องใช้ Bearer token / refresh interceptor
// (ถ้าใช้ /lib/api ที่มี interceptor จะ retry refresh ทุกครั้งที่หน้าเปิด ทำให้เปลือง request)
const publicApi = axios.create({ baseURL: API_BASE, timeout: 10000 });

const SEVERITY_STYLES: Record<
  AnnouncementSeverity,
  { wrap: string; icon: typeof Info; iconClass: string }
> = {
  INFO: {
    wrap: 'bg-blue-50 text-blue-900 border-blue-200',
    icon: Info,
    iconClass: 'text-blue-600',
  },
  WARNING: {
    wrap: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  DANGER: {
    wrap: 'bg-rose-50 text-rose-900 border-rose-300',
    icon: AlertTriangle,
    iconClass: 'text-rose-600',
  },
};

export function AnnouncementsRoot() {
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    publicApi
      .get<{ items: PublicAnnouncement[] }>('/api/public/announcements')
      .then((res) => {
        if (!cancelled) setItems(res.data.items);
      })
      .catch(() => {
        // non-fatal — landing/dashboard ใช้งานต่อได้แม้โหลด announcements ไม่สำเร็จ
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((a) => !dismissedIds.has(a.id));
  const banners = visible.filter((a) => a.kind === 'BANNER');
  // popup แสดงทีละอัน เลือกตัวแรก (เรียงจาก backend: DANGER → WARNING → INFO แล้ว date desc)
  const popup = visible.find((a) => a.kind === 'POPUP') ?? null;

  function dismiss(id: number) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <>
      {/* BANNER stack — fixed top, z-index สูงกว่า sidebar/topbar */}
      {banners.length > 0 && (
        <div className="fixed inset-x-0 top-0 z-[60] flex flex-col">
          {banners.map((a) => (
            <BannerRow key={a.id} a={a} onDismiss={() => dismiss(a.id)} />
          ))}
        </div>
      )}
      {/* Spacer ใน flow — กันเนื้อหาถูกบังด้วย banner ที่ fixed
          (height ประมาณการตามจำนวน banner; ไม่ pixel-perfect แต่ป้องกันถูกทับ) */}
      {banners.length > 0 && (
        <div
          aria-hidden
          style={{ height: `${banners.length * 44}px` }}
        />
      )}

      {/* POPUP modal — กลางจอ, ทีละอัน */}
      {popup && (
        <PopupModal a={popup} onDismiss={() => dismiss(popup.id)} />
      )}
    </>
  );
}

function BannerRow({
  a,
  onDismiss,
}: {
  a: PublicAnnouncement;
  onDismiss: () => void;
}) {
  const style = SEVERITY_STYLES[a.severity];
  const Icon = style.icon;
  return (
    <div
      role="status"
      className={`flex items-center gap-3 border-b px-4 py-2 text-sm shadow-sm ${style.wrap}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden />
      <div className="min-w-0 flex-1">
        {a.title && <span className="font-semibold">{a.title} · </span>}
        <span className="break-words">{a.body}</span>
        {a.link_url && (
          <a
            href={a.link_url}
            target={a.link_url.startsWith('http') ? '_blank' : undefined}
            rel={a.link_url.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="ml-2 inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
          >
            {a.link_label || 'อ่านเพิ่ม'}
            {a.link_url.startsWith('http') && (
              <ExternalLink className="h-3 w-3" aria-hidden />
            )}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="ปิดประกาศ"
        className="shrink-0 rounded p-1 hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PopupModal({
  a,
  onDismiss,
}: {
  a: PublicAnnouncement;
  onDismiss: () => void;
}) {
  const style = SEVERITY_STYLES[a.severity];
  const Icon = style.icon;

  // ESC ปิด
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onDismiss}
        aria-hidden
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`flex items-start gap-3 border-b px-5 py-4 ${style.wrap}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 ${style.iconClass}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-70">
              <Megaphone className="h-3 w-3" aria-hidden />
              ประกาศ
            </p>
            {a.title && (
              <h2 className="mt-0.5 text-base font-semibold leading-snug">
                {a.title}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="ปิด"
            className="shrink-0 rounded-lg p-1 hover:bg-black/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {a.body}
          </p>
          {a.link_url && (
            <a
              href={a.link_url}
              target={a.link_url.startsWith('http') ? '_blank' : undefined}
              rel={a.link_url.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {a.link_label || 'อ่านเพิ่ม'}
              {a.link_url.startsWith('http') && (
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              )}
            </a>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ปิดประกาศ
          </button>
        </div>
      </div>
    </div>
  );
}
