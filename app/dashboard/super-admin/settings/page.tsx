'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Clock, Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { SystemSetting } from '@/lib/types';

const KEYS = {
  windowBefore: 'check_in.default_window_before_minutes',
  windowAfter: 'check_in.default_window_after_minutes',
  notifyInApp: 'notify.in_app.enabled',
  notifyEmail: 'notify.email.enabled',
} as const;

// jsonb อาจเป็น boolean หรือ string 'true'/'false' — normalize
const asBool = (v: unknown) => v === true || v === 'true';

export default function SettingsPage() {
  const [items, setItems] = useState<SystemSetting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [windowBefore, setWindowBefore] = useState(30);
  const [windowAfter, setWindowAfter] = useState(15);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const res = await api.get<{ items: SystemSetting[] }>(
        '/api/admin/settings',
      );
      setItems(res.data.items);
      const map = new Map(res.data.items.map((s) => [s.key, s.value]));
      setWindowBefore(Number(map.get(KEYS.windowBefore) ?? 30));
      setWindowAfter(Number(map.get(KEYS.windowAfter) ?? 15));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setLoadError(err.response?.data?.message ?? 'โหลดไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSetting(key: string, value: number | boolean) {
    setSavingKey(key);
    try {
      await api.put(`/api/admin/settings/${encodeURIComponent(key)}`, { value });
      toast.success('บันทึกแล้ว');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingKey(null);
    }
  }

  const settingMap = useMemo(
    () => new Map(items?.map((s) => [s.key, s.value]) ?? []),
    [items],
  );
  const original = useMemo(
    () => ({
      windowBefore: Number(settingMap.get(KEYS.windowBefore) ?? 30),
      windowAfter: Number(settingMap.get(KEYS.windowAfter) ?? 15),
    }),
    [settingMap],
  );

  const beforeChanged = windowBefore !== original.windowBefore;
  const afterChanged = windowAfter !== original.windowAfter;

  // kill-switch การแจ้งเตือน — อ่านจาก server เป็น source of truth (toggle = save ทันที)
  const hasNotify =
    settingMap.has(KEYS.notifyInApp) || settingMap.has(KEYS.notifyEmail);
  const notifyInApp = asBool(settingMap.get(KEYS.notifyInApp));
  const notifyEmail = asBool(settingMap.get(KEYS.notifyEmail));

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <SettingsIcon className="h-6 w-6 text-violet-600" aria-hidden />
          ตั้งค่าระบบ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          ค่าระดับระบบที่ super_admin จัดการได้
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {!items && !loadError && (
        <div className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      )}

      {items && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                ระยะเวลา check-in (default)
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                ระยะเวลาก่อน/หลังเวลากิจกรรมเริ่มที่อนุญาตให้ check-in — ใช้เมื่อกิจกรรมไม่ตั้งค่า
                check_in_opens_at/closes_at เอง
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SettingNumberRow
              label="เปิดก่อนเริ่ม (นาที)"
              value={windowBefore}
              onChange={setWindowBefore}
              min={0}
              max={240}
              changed={beforeChanged}
              saving={savingKey === KEYS.windowBefore}
              disabled={!!savingKey}
              onSave={() => saveSetting(KEYS.windowBefore, windowBefore)}
            />
            <SettingNumberRow
              label="ปิดหลังเริ่ม (นาที)"
              value={windowAfter}
              onChange={setWindowAfter}
              min={0}
              max={240}
              changed={afterChanged}
              saving={savingKey === KEYS.windowAfter}
              disabled={!!savingKey}
              onSave={() => saveSetting(KEYS.windowAfter, windowAfter)}
            />
          </div>
        </section>
      )}

      {items && hasNotify && (
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                การแจ้งเตือน (kill-switch ระดับระบบ)
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                ปิดที่นี่ = ปิดทั้งช่องทางสำหรับผู้ใช้ทุกคน (เหนือกว่าการตั้งค่าส่วนตัว) — ใช้กรณีฉุกเฉิน
                เช่น อีเมลชนโควตา
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <SettingToggleRow
              label="แจ้งเตือนในเว็บ (in-app)"
              hint="กระดิ่งแจ้งเตือนของผู้ใช้ทุกคน"
              checked={notifyInApp}
              saving={savingKey === KEYS.notifyInApp}
              disabled={!!savingKey}
              onToggle={() => saveSetting(KEYS.notifyInApp, !notifyInApp)}
            />
            <SettingToggleRow
              label="แจ้งเตือนทางอีเมล"
              hint="ต้องตั้งค่า SMTP ฝั่งเซิร์ฟเวอร์ด้วยจึงจะส่งได้จริง"
              checked={notifyEmail}
              saving={savingKey === KEYS.notifyEmail}
              disabled={!!savingKey}
              onToggle={() => saveSetting(KEYS.notifyEmail, !notifyEmail)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function SettingToggleRow({
  label,
  hint,
  checked,
  saving,
  disabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={saving || disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
          checked ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        {saving ? (
          <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" aria-hidden />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        )}
      </button>
    </div>
  );
}

function SettingNumberRow({
  label,
  value,
  onChange,
  min,
  max,
  changed,
  saving,
  disabled,
  onSave,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  changed: boolean;
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {label}{' '}
        <span className="font-normal text-gray-400">
          ({min}–{max})
        </span>
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={saving || disabled}
          className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={!changed || saving || disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {saving ? '...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}
