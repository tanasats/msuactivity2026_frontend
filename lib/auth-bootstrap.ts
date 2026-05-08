'use client';

import { useEffect } from 'react';
import { api } from './api';
import { useAuthStore } from './store';
import type { User } from './types';

// hook สำหรับ bootstrap session ทุก page ที่ require auth
// - ลอง refresh ที่ /api/auth/refresh ผ่าน rt cookie
// - ถ้าได้ → fetch /api/auth/me
// - ถ้า fail → clear store
//
// dedup ผ่าน inflight promise (ไม่ใช้ module-level flag เพราะค้างหลัง hot reload)
// guard ผ่าน store state — ถ้า bootstrap จบแล้ว (isBootstrapping=false) จะ skip
let inflight: Promise<void> | null = null;

async function runBootstrap(): Promise<void> {
  try {
    // ✦ short-circuit: ถ้า callback page เพิ่ง set state ครบแล้ว (token + user) ไม่ต้อง refresh ซ้ำ
    //   ลด race condition ที่ทำให้หน้า redirect ค้าง — runBootstrap ที่รันคู่ขนานกับ navigation
    //   เคยทำให้ user object ถูก overwrite ระหว่างที่ effect กำลังเด้งไปหน้า role-specific
    const s = useAuthStore.getState();
    if (s.accessToken && s.user) {
      s.setBootstrapping(false);
      return;
    }

    const refreshRes = await api.post<{ access_token: string }>(
      '/api/auth/refresh',
    );
    useAuthStore.getState().setAccessToken(refreshRes.data.access_token);

    const meRes = await api.get<User>('/api/auth/me');
    useAuthStore
      .getState()
      .setAuth(refreshRes.data.access_token, meRes.data);
  } catch {
    useAuthStore.getState().clearAuth();
  } finally {
    useAuthStore.getState().setBootstrapping(false);
    inflight = null;
  }
}

export function useAuthBootstrap() {
  useEffect(() => {
    // ถ้า bootstrap เสร็จไปแล้ว (จาก hook ก่อนหน้าใน tree เดียวกัน) → ไม่ทำซ้ำ
    if (!useAuthStore.getState().isBootstrapping) return;
    // dedup concurrent calls (page หลายหน้า mount พร้อมกัน — เช่น layout + page)
    if (!inflight) inflight = runBootstrap();
  }, []);
}
