'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  PencilLine,
  Plus,
  PowerOff,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { MasterFaculty } from '@/lib/types';

// code = ตัวอักษรพิมพ์ใหญ่/ตัวเลข 1-10 ตัว (matches backend regex)
const CODE_REGEX = /^[A-Z0-9]{1,10}$/;

interface FormValue {
  code: string;
  name: string;
  hasStudents: boolean; // checkbox → category 'A' (true) หรือ null (false)
  is_active: boolean;
}

const EMPTY_FORM: FormValue = {
  code: '',
  name: '',
  hasStudents: false,
  is_active: true,
};

type CategoryFilter = 'all' | 'A' | 'none';

export default function FacultiesPage() {
  const [items, setItems] = useState<MasterFaculty[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [editing, setEditing] = useState<MasterFaculty | null>(null);
  const [creating, setCreating] = useState(false);
  const [formValue, setFormValue] = useState<FormValue>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [pendingToggle, setPendingToggle] = useState<MasterFaculty | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await api.get<{ items: MasterFaculty[] }>('/api/faculties');
      setItems(res.data.items);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      if (!showInactive && !f.is_active) return false;
      if (categoryFilter === 'A' && f.category !== 'A') return false;
      if (categoryFilter === 'none' && f.category !== null) return false;
      if (!q) return true;
      return (
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      );
    });
  }, [items, search, showInactive, categoryFilter]);

  function openCreate() {
    setFormValue(EMPTY_FORM);
    setCreating(true);
    setEditing(null);
  }
  function openEdit(f: MasterFaculty) {
    setFormValue({
      code: f.code,
      name: f.name,
      hasStudents: f.category === 'A',
      is_active: f.is_active,
    });
    setEditing(f);
    setCreating(false);
  }
  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function executeSave() {
    const code = formValue.code.trim().toUpperCase();
    const name = formValue.name.trim();
    if (!CODE_REGEX.test(code)) {
      toast.error('รหัสต้องเป็นตัวอักษรพิมพ์ใหญ่/ตัวเลข 1–10 ตัว');
      return;
    }
    if (!name) {
      toast.error('กรอกชื่อให้ครบ');
      return;
    }
    setSaving(true);
    try {
      const body = {
        code,
        name,
        category: formValue.hasStudents ? 'A' : null,
        is_active: formValue.is_active,
      };
      if (editing) {
        await api.patch<MasterFaculty>(`/api/faculties/${editing.id}`, body);
        toast.success(`บันทึก "${name}" แล้ว`);
      } else {
        await api.post<MasterFaculty>('/api/faculties', body);
        toast.success(`เพิ่ม "${name}" แล้ว`);
      }
      closeForm();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function executeToggle() {
    if (!pendingToggle) return;
    setBusy(true);
    try {
      if (pendingToggle.is_active) {
        await api.delete(`/api/faculties/${pendingToggle.id}`);
        toast.success(`ปิดใช้งาน "${pendingToggle.name}" แล้ว`);
      } else {
        await api.patch(`/api/faculties/${pendingToggle.id}`, {
          is_active: true,
        });
        toast.success(`เปิดใช้งาน "${pendingToggle.name}" แล้ว`);
      }
      setPendingToggle(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'ดำเนินการไม่สำเร็จ');
      setPendingToggle(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <GraduationCap className="h-6 w-6 text-violet-600" aria-hidden />
            คณะ
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการรายการคณะ (faculties) — category &quot;A&quot; = มีนิสิตสังกัด
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          เพิ่มคณะ
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส / ชื่อ"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
              aria-label="ล้าง"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          aria-label="ประเภทคณะ"
        >
          <option value="all">ทุกประเภท</option>
          <option value="A">มีนิสิตสังกัด (A)</option>
          <option value="none">ไม่ระบุ</option>
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          แสดงที่ปิดใช้งาน
        </label>
      </div>

      {items && (
        <p className="mb-2 text-xs text-gray-500">
          พบ <span className="font-semibold text-gray-900">{filtered?.length ?? 0}</span> รายการ
          {' '}จากทั้งหมด <span className="font-semibold text-gray-900">{items.length}</span>
        </p>
      )}

      {!items && !error && <ListSkeleton />}
      {filtered && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          ไม่มีรายการ
        </div>
      )}
      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">รหัส</th>
                <th className="px-4 py-3 text-left">ชื่อคณะ</th>
                <th className="px-4 py-3 text-left">ประเภท</th>
                <th className="px-4 py-3 text-left">สถานะ</th>
                <th className="px-4 py-3 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className={f.is_active ? 'hover:bg-gray-50' : 'bg-gray-50/50 opacity-60 hover:opacity-100'}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {f.code}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{f.name}</td>
                  <td className="px-4 py-3">
                    {f.category === 'A' ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        มีนิสิตสังกัด
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {f.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <PencilLine className="h-3.5 w-3.5" aria-hidden />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingToggle(f)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                          f.is_active
                            ? 'border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {f.is_active ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5" aria-hidden />
                            ปิดใช้งาน
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            เปิดใช้งาน
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <FormDialog
          title={editing ? 'แก้ไขคณะ' : 'เพิ่มคณะ'}
          value={formValue}
          saving={saving}
          onChange={setFormValue}
          onSave={executeSave}
          onClose={closeForm}
        />
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        tone={pendingToggle?.is_active ? 'danger' : 'default'}
        title={pendingToggle?.is_active ? 'ปิดใช้งานคณะ?' : 'เปิดใช้งานคณะ?'}
        message={
          pendingToggle && (
            <>
              {pendingToggle.is_active ? 'ปิดใช้งาน ' : 'เปิดใช้งาน '}
              <strong>{pendingToggle.name}</strong>
              {pendingToggle.is_active &&
                ' — ผู้ใช้/กิจกรรมที่ผูกกับคณะนี้อยู่จะยังคงเก็บข้อมูล แต่คณะนี้จะไม่ปรากฏในตัวเลือกใหม่'}
            </>
          )
        }
        confirmLabel={pendingToggle?.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        loading={busy}
        onConfirm={executeToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}

function FormDialog({
  title,
  value,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  title: string;
  value: FormValue;
  saving: boolean;
  onChange: (v: FormValue) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              รหัส <span className="text-rose-600">*</span>
              <span className="ml-2 text-xs font-normal text-gray-400">
                ตัวอักษรพิมพ์ใหญ่/ตัวเลข 1–10 ตัว เช่น 01, ENG
              </span>
            </label>
            <input
              type="text"
              value={value.code}
              onChange={(e) =>
                onChange({ ...value, code: e.target.value.toUpperCase() })
              }
              maxLength={10}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อคณะ <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.hasStudents}
              onChange={(e) =>
                onChange({ ...value, hasStudents: e.target.checked })
              }
              disabled={saving}
              className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span>
              มีนิสิตสังกัด (category = &quot;A&quot;)
              <span className="block text-xs text-gray-500">
                คณะที่นิสิตเลือกเข้าศึกษา — จะปรากฏในตัวเลือก &quot;คณะที่รับสมัคร&quot;
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.is_active}
              onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
              disabled={saving}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            เปิดใช้งาน
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
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
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
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}
