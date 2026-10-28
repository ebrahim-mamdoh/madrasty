import type { FeatureKey } from "./features";
import type { PermissionKey } from "./permissions";
import type { AppRole } from "./roles";
import type { AttendanceCounts, AttendanceStatus } from "./schemas/attendance";

export type SchoolStatus = "active" | "suspended";

export type SchoolBranding = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export type School = {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  branding: SchoolBranding;
  locale: "ar" | "en";
  timezone: string;
  /** Weekdays the school teaches on (0 = Sunday … 6 = Saturday). */
  studyDays: number[];
  createdAt: string;
};

export type SchoolListItem = Pick<School, "id" | "name" | "slug" | "status" | "createdAt"> & {
  studentsCount: number;
  teachersCount: number;
};

export type Profile = {
  id: string;
  schoolId: string | null;
  role: AppRole;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

/** Everything a portal needs about the signed-in user, resolved once per request on the server. */
export type SessionContext = {
  profile: Profile;
  school: School | null;
  permissions: PermissionKey[];
  features: FeatureKey[];
};

export type AcademicYear = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  classesCount: number;
};

export type GradeLevel = {
  id: string;
  name: string;
  sortOrder: number;
  classesCount: number;
};

export type Subject = {
  id: string;
  name: string;
  code: string | null;
};

export type SchoolClass = {
  id: string;
  name: string;
  academicYearId: string;
  gradeLevel: { id: string; name: string };
  homeroomTeacher: { id: string; fullName: string } | null;
  studentsCount: number;
  subjectsCount: number;
};

/** A subject taught in a class, and who teaches it. */
export type ClassSubject = {
  id: string;
  subject: { id: string; name: string };
  teacher: { id: string; fullName: string } | null;
};

/** A class as seen from a teacher's workspace (current academic year). */
export type TeacherClass = {
  id: string;
  name: string;
  gradeLevelName: string;
  studentsCount: number;
  /** Subjects this teacher teaches in the class (may be empty for a homeroom-only class). */
  subjects: string[];
  isHomeroom: boolean;
};

/** A row in the teachers / students / parents lists. */
export type PersonListItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  /** Students: their class in the current academic year. */
  currentClass?: { id: string; name: string } | null;
  /** Students: linked parents. Parents: linked children. */
  links?: { id: string; fullName: string }[];
};

/** Minimal person reference for pickers (e.g. choosing a homeroom teacher). */
export type PersonOption = {
  id: string;
  fullName: string;
  /** Extra context to tell people apart in a picker (e.g. a student's class). */
  detail?: string;
};

/** What a server action needs to authorize work on someone else's account. */
export type PersonRef = {
  id: string;
  schoolId: string | null;
  role: AppRole;
  fullName: string;
  isActive: boolean;
};

export type PlatformStats = {
  schoolsTotal: number;
  schoolsActive: number;
  studentsTotal: number;
  teachersTotal: number;
};

export type StaffRole = {
  id: string;
  name: string;
  permissions: PermissionKey[];
  membersCount: number;
};

/** A staff member or teacher with everything that grants them permissions. */
export type PersonAccess = {
  id: string;
  fullName: string;
  role: "staff" | "teacher";
  roleIds: string[];
  permissions: PermissionKey[];
};

export type SchoolAdmin = {
  id: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
};

/** One period of the school day (e.g. "1st period, 08:00–08:45"). */
export type Period = {
  id: string;
  number: number;
  /** `HH:MM` */
  startsAt: string;
  /** `HH:MM` */
  endsAt: string;
};

/** One filled slot of a weekly timetable. */
export type TimetableEntry = {
  id: string;
  weekday: number;
  periodId: string;
  classSubjectId: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  teacher: { id: string; fullName: string } | null;
};

/** A subject of the student's class with the teacher who teaches it. */
export type StudentSubject = {
  id: string;
  subjectName: string;
  subjectCode: string | null;
  teacherName: string | null;
};

/** A student on a class's daily attendance sheet, with what was recorded (if anything). */
export type AttendanceRosterEntry = {
  studentId: string;
  fullName: string;
  status: AttendanceStatus | null;
  note: string;
};

export type AttendanceDay = {
  entries: AttendanceRosterEntry[];
  /** When the sheet was last saved (null while the day isn't recorded yet). */
  lastRecordedAt: string | null;
};

/** Per-student counts over a period (class report). */
export type AttendanceSummaryRow = AttendanceCounts & {
  studentId: string;
  fullName: string;
};

/** One day in a student's own history. */
export type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  className: string;
};
