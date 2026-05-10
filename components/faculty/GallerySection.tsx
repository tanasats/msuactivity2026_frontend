'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ActivityGalleryPhoto } from '@/lib/types';

const MAX_PHOTOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

interface Props {
  activityId: number;
  // true = ผู้ใช้เป็น created_by + status=WORK → เปิด add/delete
  manageable: boolean;
}

// รูปประกอบกิจกรรม — แสดงเป็น thumbnail grid
//   - ดึงข้อมูลผ่าน /api/faculty/activities/:id/gallery (separate fetch จาก activity detail)
//   - upload ทีละไฟล์, อัปเดต local state ทันทีหลัง response (progressive)
export function GallerySection({ activityId, manageable }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ActivityGalleryPhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<ActivityGalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const res = await api.get<{ items: ActivityGalleryPhoto[] }>(
        `/api/faculty/activities/${activityId}/gallery`,
      );
      setItems(res.data.items);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setLoadError(err.response?.data?.message ?? 'โหลดรูปประกอบไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const remaining =
    items === null ? MAX_PHOTOS : Math.max(0, MAX_PHOTOS - items.length);
  const canAddMore = manageable && remaining > 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !items) return;

    const arr = Array.from(files);
    setUploading(true);
    let added = 0;
    try {
      for (const file of arr) {
        if ((items.length + added) >= MAX_PHOTOS) {
          toast.error(`อัปโหลดได้ไม่เกิน ${MAX_PHOTOS} รูป`);
          break;
        }
        if (file.size > MAX_BYTES) {
          toast.error(
            `${file.name}: ขนาดไฟล์เกิน ${MAX_BYTES / 1024 / 1024} MB`,
          );
          continue;
        }
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await api.post<ActivityGalleryPhoto>(
            `/api/faculty/activities/${activityId}/gallery`,
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );
          // append แบบ functional ให้ count ถูกต้องระหว่าง loop
          setItems((prev) => (prev ? [...prev, res.data] : [res.data]));
          added++;
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } };
          toast.error(
            err.response?.data?.message ?? `อัปโหลด ${file.name} ไม่สำเร็จ`,
          );
          // หยุดทั้งหมดถ้าเจอ 409 (เกิน limit) — ครั้งถัดไปก็จะเกินอยู่ดี
          if ((e as { response?: { status?: number } })?.response?.status === 409)
            break;
        }
      }
      if (added > 0) toast.success(`อัปโหลด ${added} รูปเรียบร้อย`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(
        `/api/faculty/activities/${activityId}/gallery/${pendingDelete.id}`,
      );
      setItems((prev) =>
        prev ? prev.filter((p) => p.id !== pendingDelete.id) : prev,
      );
      toast.success('ลบรูปเรียบร้อย');
      setPendingDelete(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ลบไม่สำเร็จ');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            รูปประกอบกิจกรรม
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {manageable
              ? `ระหว่างกิจกรรมดำเนินการ — เพิ่มได้สูงสุด ${MAX_PHOTOS} รูป (JPG/PNG/WebP, ≤ ${
                  MAX_BYTES / 1024 / 1024
                } MB)`
              : 'ดูได้อย่างเดียว — เปิดให้เพิ่ม/ลบเฉพาะตอนกิจกรรมอยู่ในสถานะดำเนินการ'}
          </p>
        </div>
        {items !== null && (
          <span className="text-xs text-gray-500">
            {items.length}/{MAX_PHOTOS} รูป
          </span>
        )}
      </div>

      {loadError && (
        <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {canAddMore && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            {uploading ? 'กำลังอัปโหลด...' : `เพิ่มรูป (เหลือ ${remaining})`}
          </button>
        </>
      )}

      {items === null && !loadError && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-md bg-gray-100"
            />
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-xs text-gray-500">
          ยังไม่มีรูปประกอบ
          {manageable && ' — กด "เพิ่มรูป" เพื่ออัปโหลดได้เลย'}
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {items.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100"
            >
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                title={p.filename}
                className="block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              {manageable && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(p)}
                  className="absolute right-1 top-1 hidden rounded-md bg-rose-600/90 p-1 text-white hover:bg-rose-700 group-hover:block"
                  aria-label="ลบรูป"
                  title="ลบรูป"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        tone="danger"
        title="ลบรูปนี้?"
        message={
          pendingDelete && (
            <>
              ลบรูป <strong>{pendingDelete.filename}</strong> ออกจากกิจกรรม —
              ไม่สามารถกู้คืนได้
            </>
          )
        }
        confirmLabel="ลบ"
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
