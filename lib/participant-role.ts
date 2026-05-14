import type { ParticipantRole } from './types';

// label + tone class สำหรับแสดงบทบาทผู้เข้าร่วม
//   PARTICIPANT = default — มักจะไม่แสดง badge เพราะเป็นค่าพื้นฐาน
//   ORGANIZER / LEADER = สื่อชัด ใช้สีต่างกัน
export const PARTICIPANT_ROLE_LABEL: Record<
  ParticipantRole,
  { text: string; short: string; code: string; tone: string }
> = {
  PARTICIPANT: {
    text: 'ผู้เข้าร่วมกิจกรรม',
    short: 'ผู้เข้าร่วม',
    code: 'C',
    tone: 'bg-gray-100 text-gray-700',
  },
  ORGANIZER: {
    text: 'ผู้ดำเนินโครงการ',
    short: 'ผู้ดำเนินโครงการ',
    code: 'B',
    tone: 'bg-blue-100 text-blue-800',
  },
  LEADER: {
    text: 'ผู้รับผิดชอบโครงการ',
    short: 'ผู้รับผิดชอบ',
    code: 'A',
    tone: 'bg-amber-100 text-amber-900',
  },
};

export const PARTICIPANT_ROLE_ORDER: ParticipantRole[] = [
  'PARTICIPANT',
  'ORGANIZER',
  'LEADER',
];
