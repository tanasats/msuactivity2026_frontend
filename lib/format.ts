// ฟอร์แมตข้อมูลสำหรับ UI ภาษาไทย
// - วันที่: ใช้ปฏิทินพุทธ (Buddhist calendar) ผ่าน Intl
// - เลข: ใช้คอมม่าคั่นพันคน

const dateFmt = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFmt = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
});
const numFmt = new Intl.NumberFormat('th-TH');

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
export function formatNumber(n: number): string {
  return numFmt.format(n);
}

// "5 พ.ค. 2569 09:00 – 12:00" (สั้นเมื่อวันเดียวกัน)
export function formatActivityRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${formatDateTime(startIso)} – ${formatTime(endIso)}`;
  }
  return `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
}
