import type { FeatureKey } from "./features";
import type { PermissionKey } from "./permissions";
import type { AppRole } from "./roles";

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
