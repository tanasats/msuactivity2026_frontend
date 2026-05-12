'use client';

import { api } from './api';
import { toast } from './toast';

// ดาวน์โหลดไฟล์จาก endpoint ที่ต้อง auth (Bearer token)
//   - ใช้ axios เพื่อให้ interceptor แนบ token อัตโนมัติ
//   - responseType='blob' กัน axios แปลง CSV เป็น string/JSON
//   - filename ดึงจาก Content-Disposition (รองรับ filename*=UTF-8'')
//   - fallback filename = ตัว fallback ที่ caller ส่งมา
export async function downloadAuthed(url: string, fallbackFilename: string) {
  try {
    const res = await api.get<Blob>(url, { responseType: 'blob' });
    // axios header values อาจเป็น string | number | boolean | string[] | AxiosHeaders
    // — แปลงเป็น string เท่านั้น (กัน type error)
    const ctRaw = res.headers['content-type'];
    const contentType = typeof ctRaw === 'string' ? ctRaw : 'application/octet-stream';
    const cdRaw = res.headers['content-disposition'];
    const cd = typeof cdRaw === 'string' ? cdRaw : undefined;
    const filename = parseFilename(cd) || fallbackFilename;

    const blob = new Blob([res.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown } };
    // backend อาจตอบ JSON error (เช่น 401 token expired) — fallback message
    toast.error(
      typeof err.response?.data === 'string'
        ? err.response.data
        : 'ดาวน์โหลดไม่สำเร็จ',
    );
  }
}

// parse Content-Disposition — รองรับทั้ง filename="..." และ filename*=UTF-8''<encoded>
function parseFilename(header: string | undefined): string | null {
  if (!header) return null;
  // RFC 5987: filename*=UTF-8''<percent-encoded> ← preferred
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  // RFC 6266 fallback: filename="..."
  const plain = header.match(/filename="([^"]+)"/i);
  return plain ? plain[1] : null;
}
