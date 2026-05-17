'use client';

import { useRef, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ActivityDocument } from '@/lib/types';

interface Props {
  activityId: number;
  documents: ActivityDocument[];
  // true ถ้า status DRAFT/WORK + ผู้ใช้เป็น created_by — control mutation buttons
  manageable: boolean;
  onChanged: () => void; // หลัง mutation เรียก parent ให้ refresh ข้อมูล
}

const ACCEPT =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 20 * 1024 * 1024;

export function DocumentsSection({
  activityId,
  documents,
  manageable,
  onChanged,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ActivityDocument | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function handleFileChange(file: File) {
    setUploadError(null);
    if (file.size > MAX_BYTES) {
      setUploadError(`ขนาดไฟล์ต้องไม่เกิน ${MAX_BYTES / 1024 / 1024} MB`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/api/faculty/activities/${activityId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChanged();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setUploadError(err.response?.data?.message ?? 'อัปโหลดไม่สำเร็จ');
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
        `/api/faculty/activities/${activityId}/documents/${pendingDelete.id}`,
      );
      setPendingDelete(null);
      onChanged();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">เอกสารประกอบ</h2>
        {manageable && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              // className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มเอกสาร'}
            </button>
          </>
        )}
      </div>

      {uploadError && (
        <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {uploadError}
        </div>
      )}

      {!manageable && (
        <p className="mb-3 text-xs text-gray-500">
          สถานะปัจจุบันไม่อนุญาตให้แก้ไขเอกสาร — ดูรายการได้อย่างเดียว
        </p>
      )}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500">
          {manageable
            ? 'ยังไม่มีเอกสาร — กด "เพิ่มเอกสาร" เพื่ออัปโหลด PDF/DOC/XLS'
            : 'ยังไม่มีเอกสารประกอบ'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              activityId={activityId}
              manageable={manageable}
              onChanged={onChanged}
              onAskDelete={() => setPendingDelete(d)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        tone="danger"
        title="ลบเอกสารนี้?"
        message={
          pendingDelete && (
            <>
              ลบไฟล์ <strong>{pendingDelete.display_name || pendingDelete.filename}</strong>{' '}
              ออกจากกิจกรรม — ลบแล้วไม่สามารถกู้คืนได้
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

function DocumentRow({
  doc,
  activityId,
  manageable,
  onChanged,
  onAskDelete,
}: {
  doc: ActivityDocument;
  activityId: number;
  manageable: boolean;
  onChanged: () => void;
  onAskDelete: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(doc.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    const next = nameDraft.trim();
    try {
      await api.patch(`/api/faculty/activities/${activityId}/documents/${doc.id}`, {
        display_name: next === '' ? null : next,
      });
      onChanged();
      setEditingName(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingName(false);
    }
  }

  async function togglePublic() {
    setSavingPublic(true);
    try {
      await api.patch(`/api/faculty/activities/${activityId}/documents/${doc.id}`, {
        is_public: !doc.is_public,
      });
      onChanged();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingPublic(false);
    }
  }

  const displayed = doc.display_name?.trim() || doc.filename;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <FileText className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />

      <div className="min-w-0 flex-1">
        {editingName ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={doc.filename}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={saveName}
              disabled={savingName}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setNameDraft(doc.display_name ?? '');
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-gray-900">
              {displayed}
              {!doc.display_name && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  (ใช้ชื่อไฟล์)
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {doc.filename} · {formatSize(doc.size_bytes)}
            </p>
          </>
        )}
      </div>

      {/* visibility */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          doc.is_public
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {doc.is_public ? (
          <>
            <Eye className="h-3 w-3" aria-hidden />
            สาธารณะ
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" aria-hidden />
            ส่วนตัว
          </>
        )}
      </span>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          title="ดาวน์โหลด"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          ดาวน์โหลด
        </a>
        {manageable && !editingName && (
          <>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              แก้ชื่อ
            </button>
            <button
              type="button"
              onClick={togglePublic}
              disabled={savingPublic}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title={doc.is_public ? 'เปลี่ยนเป็นส่วนตัว' : 'เปลี่ยนเป็นสาธารณะ'}
            >
              {doc.is_public ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden />
              )}
              {doc.is_public ? 'ปิดสาธารณะ' : 'เปิดสาธารณะ'}
            </button>
            <button
              type="button"
              onClick={onAskDelete}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              ลบ
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
