'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ActivityForm } from '@/components/faculty/ActivityForm';
import type { FacultyActivityDetail } from '@/lib/types';

// หน้าสร้างกิจกรรม สำหรับ admin / super_admin (cross-faculty)
//   - แยกออกจาก /dashboard/faculty/activities/new (ของ faculty_staff)
//   - admin ต้องเลือก "คณะ/หน่วยงาน" ของกิจกรรมเอง (ActivityForm จะ render faculty picker
//     อัตโนมัติเมื่อ role = admin/super_admin)
//   - หลังสร้างเสร็จ → กลับไปหน้ารายละเอียดฝั่ง admin
//   - ใช้ endpoint POST /api/faculty/activities (เดียวกับ faculty — backend รับ body.faculty_id
//     สำหรับ admin role)

interface AcademicYearsResponse {
  current: number;
  available: number[];
}

export default function AdminNewActivityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [defaultAcademicYear, setDefaultAcademicYear] = useState<number | null>(
    null,
  );

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
      router.replace(`/dashboard/admin/activities/${res.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <Link
        href="/dashboard/admin/activities"
        className="mb-4 inline-block text-sm text-indigo-600 hover:underline"
      >
        ← กลับรายการกิจกรรม
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        สร้างกิจกรรมใหม่ (admin)
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        ต้องเลือกคณะ/หน่วยงานของกิจกรรม — บันทึกแล้วจะเป็นฉบับร่าง (DRAFT)
        แก้ไขได้ก่อนเปลี่ยนสถานะ
      </p>

      {/* รอ default ปีจาก backend ก่อนค่อย mount form */}
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
