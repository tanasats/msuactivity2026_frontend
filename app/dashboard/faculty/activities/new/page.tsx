'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ActivityForm } from '@/components/faculty/ActivityForm';
import type { FacultyActivityDetail } from '@/lib/types';

interface AcademicYearsResponse {
  current: number;
  available: number[];
}

export default function NewActivityPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const [saving, setSaving] = useState(false);

  // current academic year มาจาก backend (เคารพ system_settings.academic_year.start_*)
  // ใช้เป็น default ของ field academic_year ในฟอร์มสร้างใหม่
  const [defaultAcademicYear, setDefaultAcademicYear] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<AcademicYearsResponse>('/api/faculty/academic-years')
      .then((res) => {
        if (!cancelled) setDefaultAcademicYear(res.data.current);
      })
      .catch(() => {
        // non-fatal — ฟอร์มจะใช้ fallback boundary client-side
        if (!cancelled) setDefaultAcademicYear(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(payload: unknown) {
    setSaving(true);
    try {
      const res = await api.post<FacultyActivityDetail>(
        '/api/faculty/activities',
        payload,
      );
      // admin/super_admin → ไปหน้ารายละเอียดฝั่ง admin (ไม่ใช่ /faculty/ ที่ scope ตามคณะ)
      const detailPath = isAdminRole
        ? `/dashboard/admin/activities/${res.data.id}`
        : `/dashboard/faculty/activities/${res.data.id}`;
      router.replace(detailPath);
    } finally {
      setSaving(false);
    }
  }

  const backHref = isAdminRole
    ? '/dashboard/admin/activities'
    : '/dashboard/faculty/activities';

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <Link
        href={backHref}
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← กลับรายการกิจกรรม
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        สร้างกิจกรรมใหม่
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        บันทึกแล้วจะเป็นฉบับร่าง (DRAFT) — แก้ไขได้ก่อนกดส่งให้ admin อนุมัติ
      </p>

      {/* รอ default ปีจาก backend ก่อนค่อย mount form — กัน flicker / re-init state */}
      {defaultAcademicYear === null ? (
        <div className="h-96 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      ) : (
        <ActivityForm
          mode="create"
          saving={saving}
          onSave={handleSave}
          defaultAcademicYear={defaultAcademicYear || undefined}
        />
      )}
    </div>
  );
}
