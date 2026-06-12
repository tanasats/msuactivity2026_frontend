'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  ScrollText,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/lib/store';
import { formatDate, formatNumber } from '@/lib/format';
import type { CertRequirementRule } from '@/lib/types';

const PREFIX_OPTIONS = 'ABCDEFGHIJ'.split('');

export default function AdminCertRequirementsPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'super_admin';

  const [active, setActive] = useState<CertRequirementRule | null>(null);
  const [history, setHistory] = useState<CertRequirementRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        active: CertRequirementRule | null;
        history: CertRequirementRule[];
      }>('/api/admin/cert-requirements');
      setActive(res.data.active);
      setHistory(res.data.history);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ScrollText className="h-6 w-6 text-indigo-600" aria-hidden />
            เกณฑ์การออก Transcript
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            กำหนดเงื่อนไขที่นิสิตต้องผ่านครบเพื่อขอ transcript กิจกรรม
          </p>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            สร้างเกณฑ์ใหม่ (แทนเกณฑ์เดิม)
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Active rule card */}
      {loading && !active ? (
        <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      ) : active ? (
        <div className="mb-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              เกณฑ์ที่ใช้งานอยู่
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                active
              </span>
            </h2>
            <span className="text-xs text-gray-500">
              เริ่มใช้ {formatDate(active.effective_from)}
            </span>
          </div>
          <RuleSummary rule={active} />
          {active.note && (
            <p className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
              <span className="font-medium text-gray-500">หมายเหตุ:</span> {active.note}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">ยังไม่มีเกณฑ์ที่ใช้งานอยู่</p>
            <p className="mt-0.5 text-xs text-amber-700">
              นิสิตจะไม่สามารถขอ transcript ได้จนกว่าจะมีเกณฑ์ —{' '}
              {isSuperAdmin ? 'กด "สร้างเกณฑ์ใหม่"' : 'รอ super_admin ตั้งค่า'}
            </p>
          </div>
        </div>
      )}

      {/* History */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">ประวัติการเปลี่ยนเกณฑ์</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีประวัติ</p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <HistoryRow key={r.id} rule={r} isActive={r.id === active?.id} />
            ))}
          </div>
        )}
      </section>

      {showEditor && (
        <RuleEditorDialog
          current={active}
          onClose={() => setShowEditor(false)}
          onSaved={async () => {
            setShowEditor(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ── RuleSummary: render 3 เกณฑ์เป็น cards เรียง 3 คอลัมน์ ────────
function RuleSummary({ rule }: { rule: CertRequirementRule }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <RuleStatCard
        label="กิจกรรมคณะ/มหาวิทยาลัย"
        hint={`รหัสขึ้นต้น: ${rule.group_a_prefixes.join(', ')}`}
        value={rule.group_a_min_activities}
        unit="กิจกรรม"
        tone="indigo"
      />
      <RuleStatCard
        label="กิจกรรมองค์กรนิสิต"
        hint={`รหัสขึ้นต้น: ${rule.group_b_prefixes.join(', ')}`}
        value={rule.group_b_min_activities}
        unit="กิจกรรม"
        tone="violet"
      />
      <RuleStatCard
        label="ชั่วโมงรวม"
        hint="รวมจากทั้ง 2 กลุ่ม"
        value={rule.min_total_hours}
        unit="ชั่วโมง"
        tone="emerald"
      />
    </div>
  );
}

function RuleStatCard({
  label,
  hint,
  value,
  unit,
  tone,
}: {
  label: string;
  hint: string;
  value: number;
  unit: string;
  tone: 'indigo' | 'violet' | 'emerald';
}) {
  const toneClass = {
    indigo: 'border-indigo-200 bg-white',
    violet: 'border-violet-200 bg-white',
    emerald: 'border-emerald-200 bg-white',
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
        {formatNumber(value)}{' '}
        <span className="text-xs font-normal text-gray-500">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

// ── HistoryRow: expandable summary ────────────────────────────────
function HistoryRow({ rule, isActive }: { rule: CertRequirementRule; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border ${
        isActive ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/40'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm hover:bg-gray-50/60"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium text-gray-900">
            #{rule.id}
            {isActive && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                active
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            ใช้ตั้งแต่ {formatDate(rule.effective_from)}
            {rule.effective_to && (
              <> ถึง {formatDate(rule.effective_to)}</>
            )}
            {rule.created_by_name && (
              <> · สร้างโดย {rule.created_by_name}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="hidden sm:inline tabular-nums">
            {rule.group_a_min_activities}+{rule.group_b_min_activities} กิจกรรม · {rule.min_total_hours} ชม.
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 bg-white p-3">
          <RuleSummary rule={rule} />
          {rule.note && (
            <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium text-gray-500">หมายเหตุ:</span> {rule.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── RuleEditorDialog: super_admin สร้างเกณฑ์ใหม่ ──────────────────
function RuleEditorDialog({
  current,
  onClose,
  onSaved,
}: {
  current: CertRequirementRule | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  // default = clone จาก current (ถ้ามี) — admin แก้แล้ว save
  const [groupA, setGroupA] = useState<string[]>(
    current?.group_a_prefixes ?? ['A', 'B', 'C'],
  );
  const [groupB, setGroupB] = useState<string[]>(
    current?.group_b_prefixes ?? ['D', 'E', 'F', 'G'],
  );
  const [minA, setMinA] = useState(current?.group_a_min_activities ?? 4);
  const [minB, setMinB] = useState(current?.group_b_min_activities ?? 4);
  const [minHours, setMinHours] = useState(current?.min_total_hours ?? 100);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // overlap = prefix ที่ซ้ำกัน 2 group → error
  const overlap = groupA.filter((p) => groupB.includes(p));
  const valid =
    groupA.length > 0 &&
    groupB.length > 0 &&
    overlap.length === 0 &&
    minA >= 1 &&
    minB >= 1 &&
    minHours >= 1;

  function toggleA(p: string) {
    setGroupA((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort()));
  }
  function toggleB(p: string) {
    setGroupB((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort()));
  }

  async function submit() {
    setBusy(true);
    try {
      await api.post('/api/admin/cert-requirements', {
        group_a_prefixes: groupA,
        group_b_prefixes: groupB,
        group_a_min_activities: minA,
        group_b_min_activities: minB,
        min_total_hours: minHours,
        note: note.trim() || undefined,
      });
      toast.success('บันทึกเกณฑ์ใหม่เรียบร้อย');
      await onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">สร้างเกณฑ์ใหม่</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              เกณฑ์ใหม่จะแทนเกณฑ์เดิมทันที (เกณฑ์เดิมจะปิดในวันนี้)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {/* Group A */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              กลุ่ม A: กิจกรรมคณะ/มหาวิทยาลัย
            </label>
            <p className="mb-2 text-xs text-gray-500">
              เลือกตัวอักษรขึ้นต้นของรหัสกิจกรรม (เช่น A, B, C)
            </p>
            <PrefixSelector selected={groupA} onToggle={toggleA} disabled={busy} />
          </div>

          {/* Group B */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              กลุ่ม B: กิจกรรมองค์กรนิสิต
            </label>
            <p className="mb-2 text-xs text-gray-500">
              เลือกตัวอักษรขึ้นต้น (เช่น D, E, F, G)
            </p>
            <PrefixSelector selected={groupB} onToggle={toggleB} disabled={busy} />
          </div>

          {overlap.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                ตัวอักษร <strong>{overlap.join(', ')}</strong> อยู่ในทั้ง 2 กลุ่ม — ห้ามซ้ำ
              </span>
            </div>
          )}

          {/* Min counts + hours */}
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="จำนวนขั้นต่ำ กลุ่ม A"
              unit="กิจกรรม"
              value={minA}
              onChange={setMinA}
              disabled={busy}
            />
            <NumberField
              label="จำนวนขั้นต่ำ กลุ่ม B"
              unit="กิจกรรม"
              value={minB}
              onChange={setMinB}
              disabled={busy}
            />
            <NumberField
              label="ชั่วโมงรวมขั้นต่ำ"
              unit="ชั่วโมง"
              value={minHours}
              onChange={setMinHours}
              disabled={busy}
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              หมายเหตุ <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              disabled={busy}
              placeholder="เช่น เปลี่ยนตามมติคณะกรรมการกิจกรรม"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{note.length}/1000</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !valid}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์ใหม่'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrefixSelector({
  selected,
  onToggle,
  disabled,
}: {
  selected: string[];
  onToggle: (p: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PREFIX_OPTIONS.map((p) => {
        const active = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            disabled={disabled}
            className={`h-9 w-9 rounded-lg border font-mono text-sm font-semibold transition ${
              active
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
            } disabled:opacity-50`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  disabled,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={1}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );
}
