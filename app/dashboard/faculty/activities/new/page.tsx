'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ActivityForm } from '@/components/faculty/ActivityForm';
import type { FacultyActivityDetail } from '@/lib/types';

export default function NewActivityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSave(payload: unknown) {
    setSaving(true);
    try {
      const res = await api.post<FacultyActivityDetail>(
        '/api/faculty/activities',
        payload,
      );
      router.replace(`/dashboard/faculty/activities/${res.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-full p-6 md:p-8">
      <Link
        href="/dashboard/faculty/activities"
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

      <ActivityForm mode="create" saving={saving} onSave={handleSave} />
    </div>
  );
}
