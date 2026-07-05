'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Check, Loader2, Mail, Save, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useAuthBootstrap } from '@/lib/auth-bootstrap';
import type {
  NotificationCategoryPref,
  NotificationChannelMeta,
  NotificationPreferences,
} from '@/lib/types';

// หน้าตั้งค่าการแจ้งเตือน — เมทริกซ์ หมวด × ช่องทาง (in-app เปิดใช้, email เร็ว ๆ นี้)
export default function NotificationSettingsPage() {
  const router = useRouter();
  useAuthBootstrap();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  const [channels, setChannels] = useState<NotificationChannelMeta[]>([]);
  const [master, setMaster] = useState<Record<string, boolean>>({});
  const [cats, setCats] = useState<NotificationCategoryPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // D3 — ส่งเมลทดสอบ (เฉพาะ admin/super_admin)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // auth guard
  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) router.replace('/login');
  }, [isBootstrapping, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get<NotificationPreferences>('/api/me/notification-preferences')
      .then((res) => {
        if (cancelled) return;
        setChannels(res.data.channels_meta);
        setMaster(res.data.master);
        setCats(res.data.categories);
      })
      .catch(() => !cancelled && setError('โหลดการตั้งค่าไม่สำเร็จ'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleMaster = (ch: string) => {
    setMaster((m) => ({ ...m, [ch]: !m[ch] }));
    setSavedAt(false);
  };
  const toggleCell = (catKey: string, ch: string) => {
    setCats((prev) =>
      prev.map((c) =>
        c.key === catKey ? { ...c, values: { ...c.values, [ch]: !c.values[ch] } } : c,
      ),
    );
    setSavedAt(false);
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const prefs = Object.fromEntries(cats.map((c) => [c.key, c.values]));
      await api.put('/api/me/notification-preferences', { channels: master, prefs });
      setSavedAt(true);
    } catch {
      setError('บันทึกไม่สำเร็จ — ลองใหม่');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTestSending(true);
    setTestResult(null);
    try {
      const body = testTo.trim() ? { to: testTo.trim() } : {};
      const res = await api.post<{ to: string; redirected_to: string | null }>(
        '/api/admin/email/test',
        body,
      );
      const { to, redirected_to } = res.data;
      setTestResult({
        ok: true,
        msg: redirected_to
          ? `ส่งแล้ว — แต่ DEV redirect ไปที่ ${redirected_to} (ปลายทางจริง: ${to})`
          : `ส่งเมลทดสอบไป ${to} แล้ว`,
      });
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'ส่งไม่สำเร็จ';
      setTestResult({ ok: false, msg });
    } finally {
      setTestSending(false);
    }
  }

  if (isBootstrapping || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            กลับ
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Bell className="h-5 w-5 text-blue-600" aria-hidden />
            ตั้งค่าการแจ้งเตือน
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-6 text-sm text-gray-500">
          เลือกว่าจะรับการแจ้งเตือนแต่ละประเภททางช่องทางใด — ปิดสวิตช์รวมของช่องทางเพื่อปิดทั้งคอลัมน์
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-sm">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    ประเภทการแจ้งเตือน
                  </th>
                  {channels.map((ch) => (
                    <th key={ch.key} className="w-28 px-2 py-3 text-center font-semibold text-gray-700">
                      {ch.label}
                      {!ch.enabled && (
                        <span className="block text-[10px] font-normal text-gray-400">
                          (เร็ว ๆ นี้)
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {/* master row */}
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    รับการแจ้งเตือน (สวิตช์รวม)
                  </td>
                  {channels.map((ch) => (
                    <td key={ch.key} className="px-2 py-3 text-center">
                      <Toggle
                        checked={!!master[ch.key] && ch.enabled}
                        disabled={!ch.enabled}
                        onChange={() => toggleMaster(ch.key)}
                      />
                    </td>
                  ))}
                </tr>
                {/* category rows */}
                {cats.map((c) => (
                  <tr key={c.key}>
                    <td className="px-4 py-3 text-gray-800">{c.label}</td>
                    {channels.map((ch) => {
                      const colOff = !ch.enabled || !master[ch.key];
                      return (
                        <td key={ch.key} className="px-2 py-3 text-center">
                          <Toggle
                            checked={!!c.values[ch.key] && !colOff}
                            disabled={colOff}
                            onChange={() => toggleCell(c.key, ch.key)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Save bar */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            บันทึกการตั้งค่า
          </button>
          {savedAt && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
              <Check className="h-4 w-4" aria-hidden />
              บันทึกแล้ว
            </span>
          )}
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>

        {/* D3 — ส่งเมลทดสอบ (เฉพาะ admin) */}
        {isAdmin && (
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-blue-600" aria-hidden />
              ทดสอบระบบส่งอีเมล (สำหรับผู้ดูแล)
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              ตรวจการเชื่อมต่อ SMTP + ส่งเมลจริง 1 ฉบับ — เว้นว่างเพื่อส่งหาอีเมลของคุณเอง
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="อีเมลผู้รับ (ไม่บังคับ)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:opacity-60"
              >
                {testSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                ส่งเมลทดสอบ
              </button>
            </div>
            {testResult && (
              <p
                className={`mt-2 text-sm ${
                  testResult.ok ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {testResult.msg}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

// สวิตช์ toggle เล็ก ๆ
function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        disabled
          ? 'cursor-not-allowed bg-gray-100'
          : checked
            ? 'bg-blue-600'
            : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
