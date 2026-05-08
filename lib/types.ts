export type UserRole =
  | 'student'
  | 'staff'
  | 'faculty_staff'
  | 'executive'
  | 'admin'
  | 'super_admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  faculty_id: number | null;
  faculty_name: string | null;
  msu_id: string | null;
  picture_url: string | null;

  // staff fields (มาจาก ERP — null สำหรับนิสิต และ staff ที่ ERP ไม่ตอบ)
  staff_id: string | null;
  position_th: string | null;
  phone: string | null;
  erp_faculty_name: string | null;
  erp_department_name: string | null;
  erp_program_name: string | null;
}

// ── public landing types ─────────────────────────────────────────

export interface PublicStats {
  academic_year: number;
  activities_count: number;       // กิจกรรมทั้งหมดในปีการศึกษาปัจจุบัน
  registrations_count: number;    // ผู้ลงทะเบียน (นับ row — 1 นิสิต × 3 กิจกรรม = 3)
  members_count: number;          // สมาชิกใน users (status=active)
}

export type ActivityStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'WORK'
  | 'COMPLETED';

export interface ActivitySummary {
  id: number;
  code: string | null;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  registration_open_at: string;
  registration_close_at: string;
  hours: number;
  loan_hours: number;
  capacity: number;
  registered_count: number;
  status: ActivityStatus;
  academic_year: number;
  semester: number;
  category_code: number;
  category_name: string;
  organization_code: string;
  organization_name: string;
  poster_url?: string | null;
}

export interface ActivityPoster {
  id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
}

// เอกสารประกอบ — public version (ไม่มี is_public flag เพราะเฉพาะที่ public ถึงจะมาถึง client)
export interface PublicActivityDocument {
  id: number;
  filename: string;
  display_name: string | null;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  url: string;
}

// เอกสารประกอบ — faculty version (รวม is_public + display_name editable)
export interface ActivityDocument {
  id: number;
  filename: string;
  display_name: string | null;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  is_public: boolean;
  uploaded_at: string;
  url: string;
}

export interface ActivityDetail extends ActivitySummary {
  description: string;
  skills: { id: number; code: string; name: string }[];
  eligible_faculties: { id: number; code: string; name: string }[];
  poster: ActivityPoster | null;
  poster_url: string | null;
  documents: PublicActivityDocument[];
}

// ── faculty dashboard types ──────────────────────────────────────

export type StatusCounts = Record<ActivityStatus, number>;

export interface FacultyStats {
  faculty: StatusCounts;  // ทั้งคณะ
  mine: StatusCounts;     // เฉพาะที่ตัวเองสร้าง
}

export interface FacultyActivitySummary extends ActivitySummary {
  created_by: number;
  created_by_name: string;
  organization_id: number;
  category_id: number;
  // pg numeric parser แปลง decimal → number ให้แล้วใน backend (ดู db/index.js)
  budget_source: string | null;
  budget_requested: number | null;
  budget_actual: number | null;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
  can_edit: boolean;
}

export interface FacultyActivityDetail extends FacultyActivitySummary {
  description: string;
  approval_mode: 'AUTO' | 'MANUAL';
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: number | null;
  published_at: string | null;
  created_by_faculty_id: number | null;
  skills: { id: number; code: string; name: string }[];
  eligible_faculties: { id: number; code: string; name: string }[];
  poster: ActivityPoster | null;
  poster_url: string | null;
  documents: ActivityDocument[];
}

// ── student dashboard types ──────────────────────────────────────

export type RegistrationStatus =
  | 'PENDING_APPROVAL'
  | 'REGISTERED'
  | 'WAITLISTED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_STAFF'
  | 'REJECTED_BY_STAFF'
  | 'ATTENDED'
  | 'NO_SHOW';

// ผลประเมินการเข้าร่วมกิจกรรม (เจ้าหน้าที่คณะให้หลังเช็คอิน)
//   PENDING_EVALUATION = ตั้งอัตโนมัติตอน check-in สำเร็จ
//   PASSED / FAILED    = เจ้าหน้าที่ประเมินแล้ว (PASSED → นับชั่วโมง, FAILED → ไม่นับ)
export type EvaluationStatus = 'PENDING_EVALUATION' | 'PASSED' | 'FAILED';

export interface StudentRegistration {
  registration_id: number;
  registration_status: RegistrationStatus;
  qr_token: string | null;
  attended_at: string | null;
  attendance_status: 'VALID' | 'INVALID' | 'PENDING_REVIEW' | null;
  evaluation_status: EvaluationStatus | null;
  evaluated_at: string | null;
  evaluation_note: string | null;
  activity_id: number;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  hours: number;
  loan_hours: number;
  capacity: number;
  registered_count: number;
  activity_status: ActivityStatus;
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
  category_code: number;
  category_name: string;
  organization_code: string;
  organization_name: string;
}

export interface StudentStats {
  hours_total: number;
  loan_hours_total: number;
  activities_count: number;
}

export type BulkAddErrorReason =
  | 'NOT_FOUND'
  | 'NOT_STUDENT'
  | 'ALREADY_REGISTERED'
  | 'FULL'
  | 'NOT_OPEN'
  | 'ERROR';

export interface BulkAddResult {
  status: 'ok';
  added: { msu_id: string; user_id: number; registration_id: number }[];
  errors: { msu_id: string; reason: BulkAddErrorReason }[];
}

// ผลของการประเมินหลายคนพร้อมกัน
//   updated = id ที่เปลี่ยนสำเร็จ (เช็คอินแล้ว + ตรง activity)
//   skipped = id ที่ข้าม (ยังไม่เช็คอิน หรือไม่ใช่ของกิจกรรมนี้)
export interface BulkEvaluateResult {
  status: 'ok';
  updated: number[];
  skipped: number[];
}

// row จาก /api/faculty/activities/:id/registrations
export interface FacultyRegistration {
  registration_id: number;
  registration_status: RegistrationStatus;
  qr_token: string | null;
  registered_at: string;
  approved_at: string | null;
  approved_by: number | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancel_reason: string | null;
  attended_at: string | null;
  evaluation_status: EvaluationStatus | null;
  evaluated_at: string | null;
  evaluated_by: number | null;
  evaluation_note: string | null;
  user_id: number;
  student_name: string;
  email: string;
  msu_id: string | null;
  faculty_id: number | null;
  faculty_name: string | null;
  attendance_status: 'VALID' | 'INVALID' | 'PENDING_REVIEW' | null;
}
