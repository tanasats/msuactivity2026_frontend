'use client';

import { create } from 'zustand';

export interface ToastItem {
  id: number;
  ok: boolean;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (ok: boolean, message: string) => number;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (ok, message) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, ok, message }] }));
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

// helper API ใช้นอก React component ได้ (เรียกตรงจาก async handler)
//   toast.success('บันทึกแล้ว');
//   toast.error('สมัครไม่สำเร็จ');
export const toast = {
  success(message: string) {
    return useToastStore.getState().push(true, message);
  },
  error(message: string) {
    return useToastStore.getState().push(false, message);
  },
};
