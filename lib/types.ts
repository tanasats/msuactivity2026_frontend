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

// ── master data types (super_admin) ──────────────────────────────

export interface MasterOrganization {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterCategory {
  id: number;
  code: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterSkill {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// faculty: super_admin จัดการได้เต็มรูป (CRUD); category='A' = มีนิสิตสังกัด
export interface MasterFaculty {
  id: number;
  code: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── user management (super_admin) ────────────────────────────────

export type UserStatus = 'active' | 'disabled';

// row จาก /api/users — list/detail ใช้ shape เดียวกัน
export interface AdminUserSummary {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  msu_id: string | null;
  faculty_id: number | null;
  faculty_name: string | null;
  picture_url: string | null;
  staff_id: string | null;
  position_th: string | null;
  phone: string | null;
  erp_faculty_name: string | null;
  erp_department_name: string | null;
  erp_program_name: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── system settings (super_admin) ────────────────────────────────

export interface SystemSetting {
  key: string;
  value: number | string | boolean | null;
  updated_by: number | null;
  updated_at: string | null;
  schema: {
    type: 'integer';
    min: number;
    max: number;
  };
}

// ── announcements (admin/super_admin manage, public read) ─────────

export type AnnouncementKind = 'BANNER' | 'POPUP';
export type AnnouncementSeverity = 'INFO' | 'WARNING' | 'DANGER';

// public-facing — ตัด field ที่ไม่จำเป็นออก (created_by, is_active เพราะกรองแล้ว)
export interface PublicAnnouncement {
  id: number;
  kind: AnnouncementKind;
  severity: AnnouncementSeverity;
  title: string | null;
  body: string;
  link_url: string | null;
  link_label: string | null;
}

// admin view — มี audit fields ครบ
export interface AdminAnnouncement extends PublicAnnouncement {
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export type UserAuditAction = 'role_change' | 'faculty_change' | 'status_change';

export interface UserAuditLog {
  id: number;
  action: UserAuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  actor_id: number;
  actor_name: string;
  actor_email: string;
}

// ── public landing types ─────────────────────────────────────────

export interface PublicStats {
  academic_year: number;
  activities_count: number;       // กิจกรรมทั้งหมดในปีการศึกษาปัจจุบัน
  registrations_count: number;    // ผู้ลงทะเบียน (นับ row — 1 นิสิต × 3 กิจกรรม = 3)
  members_count: number;          // สมาชิกใน users (status=active)
}

// landing-page stats — all-time aggregates + breakdown
export interface LandingStatsByYear {
  academic_year: number;
  work_count: number;
  completed_count: number;
}
export interface LandingStatsByCategory {
  category_id: number;
  category_code: number;
  category_name: string;
  count: number;
}
export interface LandingStats {
  activities_count: number;            // WORK + COMPLETED รวมทุกปี
  members_count: number;               // active users
  by_year: LandingStatsByYear[];       // เรียง academic_year ASC
  by_category: LandingStatsByCategory[]; // เรียง category_code ASC
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

// รูปประกอบกิจกรรม (kind=GALLERY) — เพิ่ม/ลบโดยผู้สร้างได้เฉพาะ status=WORK
export interface ActivityGalleryPhoto {
  id: number;
  activity_id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  display_order: number;
  uploaded_by: number;
  uploaded_at: string;
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
  // can_edit_limited = แก้ได้บางฟิลด์ตอน status=WORK (capacity, location, dates, eligibles, description)
  can_edit_limited: boolean;
}

// ── admin types ──────────────────────────────────────────────────

// admin เห็นทุกคณะ → ต้องมี faculty_name (จาก JOIN faculties); ไม่มี is_mine/can_edit
export interface AdminActivitySummary extends ActivitySummary {
  created_by: number;
  created_by_name: string;
  faculty_id: number | null;
  faculty_name: string | null;
  organization_id: number;
  category_id: number;
  budget_source: string | null;
  budget_requested: number | null;
  budget_actual: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityDetail extends AdminActivitySummary {
  description: string;
  approval_mode: 'AUTO' | 'MANUAL';
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  published_at: string | null;
  skills: { id: number; code: string; name: string }[];
  eligible_faculties: { id: number; code: string; name: string }[];
  poster: ActivityPoster | null;
  poster_url: string | null;
  documents: ActivityDocument[];
}

export interface AdminStats {
  counts: StatusCounts;
  academic_year: number | null;
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

// รูปหลักฐานการเข้าร่วมกิจกรรม (เฉพาะ registration ที่ evaluation_status='PASSED' ถึงจะเพิ่มได้)
export interface RegistrationPhoto {
  id: number;
  registration_id: number;
  storage_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  url: string; // presigned GET URL (เพิ่มจาก backend ก่อน response)
}

export interface StudentRegistration {
  registration_id: number;
  registration_status: RegistrationStatus;
  qr_token: string | null;
  attended_at: string | null;
  attendance_status: 'VALID' | 'INVALID' | 'PENDING_REVIEW' | null;
  evaluation_status: EvaluationStatus | null;
  evaluated_at: string | null;
  evaluation_note: string | null;
  photos: RegistrationPhoto[]; // [] ถ้ายังไม่ PASSED หรือยังไม่มีรูป
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
