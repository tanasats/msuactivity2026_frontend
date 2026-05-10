'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Info,
  Megaphone,
  PencilLine,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type {
  AdminAnnouncement,
  AnnouncementKind,
  AnnouncementSeverity,
} from '@/lib/types';

const KIND_LABEL: Record<AnnouncementKind, string> = {
  BANNER: 'แถบบนสุด (Banner)',
  POPUP: 'หน้าต่างกลางจอ (Popup)',
};
const SEVERITY_LABEL: Record<AnnouncementSeverity, string> = {
  INFO: 'ข่าวสาร (Info)',
  WARNING: 'แจ้งเตือน (Warning)',
  DANGER: 'ด่วน (Danger)',
};
const SEVERITY_BADGE: Record<AnnouncementSeverity, string> = {
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  WARNING: 'bg-amber-50 text-amber-800 border-amber-300',
  DANGER: 'bg-rose-50 text-rose-700 border-rose-300',
};

interface FormValue {
  kind: AnnouncementKind;
  severity: AnnouncementSeverity;
  title: string;
  body: string;
  link_url: string;
  link_label: string;
  starts_at: string; // datetime-local string ('' = null)
  ends_at: string;
  is_active: boolean;
}

const EMPTY_FORM: FormValue = {
  kind: 'BANNER',
  severity: 'INFO',
  title: '',
  body: '',
  link_url: '',
  link_label: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

// helpers — แปลง ISO ↔ datetime-local input format (YYYY-MM-DDTHH:mm)
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<AdminAnnouncement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminAnnouncement | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await api.get<{ items: AdminAnnouncement[] }>(
        '/api/admin/announcements',
      );
      setItems(res.data.items);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(a: AdminAnnouncement) {
    setBusy(true);
    try {
      await api.patch(`/api/admin/announcements/${a.id}`, {
        is_active: !a.is_active,
      });
      toast.success(a.is_active ? 'ปิดประกาศแล้ว' : 'เปิดประกาศแล้ว');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/admin/announcements/${pendingDelete.id}`);
      toast.success('ลบประกาศเรียบร้อย');
      setPendingDelete(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  // คำนวณสถานะ "ปัจจุบันแสดงอยู่หรือเปล่า" — ดู is_active + window
  function statusOf(a: AdminAnnouncement): {
    label: string;
    tone: string;
  } {
    if (!a.is_active) return { label: 'ปิดอยู่', tone: 'bg-gray-100 text-gray-700' };
    const now = Date.now();
    const start = a.starts_at ? new Date(a.starts_at).getTime() : null;
    const end = a.ends_at ? new Date(a.ends_at).getTime() : null;
    if (start && now < start)
      return { label: 'รอเริ่ม', tone: 'bg-amber-100 text-amber-800' };
    if (end && now >= end)
      return { label: 'หมดอายุ', tone: 'bg-gray-100 text-gray-600' };
    return { label: 'แสดงอยู่', tone: 'bg-emerald-100 text-emerald-800' };
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Megaphone className="h-6 w-6 text-indigo-600" aria-hidden />
            ประกาศเว็บไซต์
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            แจ้งข่าวสาร/เตือน/ประกาศด่วน — แสดงทุกหน้าเว็บ (รวม landing public)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          ประกาศใหม่
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && !error && <ListSkeleton />}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          ยังไม่มีประกาศ — กด &quot;ประกาศใหม่&quot; เพื่อสร้าง
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((a) => {
            const status = statusOf(a);
            const SeverityIcon =
              a.severity === 'DANGER' || a.severity === 'WARNING'
                ? AlertTriangle
                : Info;
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[a.severity]}`}
                  >
                    <SeverityIcon className="h-3 w-3" aria-hidden />
                    {SEVERITY_LABEL[a.severity]}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {a.kind === 'BANNER' ? (
                      <>📢 Banner</>
                    ) : (
                      <>🪟 Popup</>
                    )}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}
                  >
                    {status.label}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {a.created_by_name} · {new Date(a.created_at).toLocaleDateString('th-TH')}
                  </span>
                </div>

                <div className="mt-3">
                  {a.title && (
                    <p className="text-base font-semibold text-gray-900">
                      {a.title}
                    </p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {a.body}
                  </p>
                  {a.link_url && (
                    <p className="mt-2 text-xs text-blue-700">
                      🔗 {a.link_label || 'อ่านเพิ่ม'} → <span className="font-mono">{a.link_url}</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    เริ่ม: {a.starts_at ? new Date(a.starts_at).toLocaleString('th-TH') : '—'}
                  </span>
                  <span>
                    หมดอายุ: {a.ends_at ? new Date(a.ends_at).toLocaleString('th-TH') : '—'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" aria-hidden />
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(a)}
                    disabled={busy}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                      a.is_active
                        ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                        : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {a.is_active ? (
                      <>
                        <PowerOff className="h-3.5 w-3.5" aria-hidden />
                        ปิดประกาศ
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5" aria-hidden />
                        เปิดประกาศ
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(a)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <FormDialog
          existing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        tone="danger"
        title="ลบประกาศนี้?"
        message={
          pendingDelete && (
            <>
              ลบประกาศ <strong>{pendingDelete.title || pendingDelete.body.slice(0, 60)}</strong> —
              ไม่สามารถกู้คืนได้
            </>
          )
        }
        confirmLabel="ลบ"
        loading={busy}
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ── form dialog (create + edit) ─────────────────────────────────

function FormDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing: AdminAnnouncement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = useMemo<FormValue>(() => {
    if (!existing) return EMPTY_FORM;
    return {
      kind: existing.kind,
      severity: existing.severity,
      title: existing.title ?? '',
      body: existing.body,
      link_url: existing.link_url ?? '',
      link_label: existing.link_label ?? '',
      starts_at: isoToLocal(existing.starts_at),
      ends_at: isoToLocal(existing.ends_at),
      is_active: existing.is_active,
    };
  }, [existing]);

  const [v, setV] = useState<FormValue>(initial);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof FormValue>(k: K, val: FormValue[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  async function save() {
    if (!v.body.trim()) {
      toast.error('กรอกเนื้อหาประกาศ');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: v.kind,
        severity: v.severity,
        title: v.title.trim() || null,
        body: v.body.trim(),
        link_url: v.link_url.trim() || null,
        link_label: v.link_label.trim() || null,
        starts_at: localToIso(v.starts_at),
        ends_at: localToIso(v.ends_at),
        is_active: v.is_active,
      };
      if (existing) {
        await api.patch(`/api/admin/announcements/${existing.id}`, payload);
        toast.success('บันทึกแล้ว');
      } else {
        await api.post('/api/admin/announcements', payload);
        toast.success('สร้างประกาศแล้ว');
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Bell className="h-5 w-5 text-indigo-600" aria-hidden />
            {existing ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}
          </h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* kind + severity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                รูปแบบการแสดง
              </label>
              <select
                value={v.kind}
                onChange={(e) => setField('kind', e.target.value as AnnouncementKind)}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {(Object.keys(KIND_LABEL) as AnnouncementKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ระดับความสำคัญ
              </label>
              <select
                value={v.severity}
                onChange={(e) =>
                  setField('severity', e.target.value as AnnouncementSeverity)
                }
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {(Object.keys(SEVERITY_LABEL) as AnnouncementSeverity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              หัวข้อ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              value={v.title}
              onChange={(e) => setField('title', e.target.value)}
              maxLength={200}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              เนื้อหา <span className="text-rose-600">*</span>
              <span className="ml-1 text-gray-400">({v.body.length}/4000)</span>
            </label>
            <textarea
              rows={4}
              value={v.body}
              onChange={(e) => setField('body', e.target.value)}
              maxLength={4000}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ลิงก์ (URL) <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={v.link_url}
                onChange={(e) => setField('link_url', e.target.value)}
                placeholder="/dashboard/... หรือ https://..."
                maxLength={500}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                ข้อความปุ่ม
              </label>
              <input
                type="text"
                value={v.link_label}
                onChange={(e) => setField('link_label', e.target.value)}
                placeholder="อ่านเพิ่ม"
                maxLength={100}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                เริ่มแสดง <span className="text-gray-400">(ไม่ตั้ง = ทันที)</span>
              </label>
              <input
                type="datetime-local"
                value={v.starts_at}
                onChange={(e) => setField('starts_at', e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                หมดอายุ <span className="text-gray-400">(ไม่ตั้ง = ไม่หมดอายุ)</span>
              </label>
              <input
                type="datetime-local"
                value={v.ends_at}
                onChange={(e) => setField('ends_at', e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={v.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              disabled={saving}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            เปิดใช้งาน (uncheck = บันทึกเป็นแบบปิดไว้ก่อน)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !v.body.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
