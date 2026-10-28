import {
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  NotebookPen,
  School,
  Settings,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey, PermissionKey, Portal } from "@madrasty/core";

export type NavKey =
  | "dashboard"
  | "schools"
  | "structure"
  | "timetable"
  | "students"
  | "teachers"
  | "parents"
  | "staff"
  | "roles"
  | "attendance"
  | "homework"
  | "exams"
  | "grades"
  | "reports"
  | "settings"
  | "my_classes"
  | "my_subjects"
  | "my_grades"
  | "schedule";

export type NavItem = {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this permission (admin portal). */
  permission?: PermissionKey;
  /** Hidden unless the school's plan includes this module. */
  feature?: FeatureKey;
};

export const NAVIGATION: Record<Portal, NavItem[]> = {
  platform: [
    { key: "dashboard", href: "/platform", icon: LayoutDashboard },
    { key: "schools", href: "/platform/schools", icon: School },
  ],
  admin: [
    { key: "dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "structure", href: "/admin/structure", icon: Layers, permission: "structure.view" },
    {
      key: "timetable",
      href: "/admin/timetable",
      icon: CalendarClock,
      permission: "structure.view",
    },
    { key: "students", href: "/admin/students", icon: GraduationCap, permission: "students.view" },
    { key: "teachers", href: "/admin/teachers", icon: Users, permission: "teachers.view" },
    { key: "parents", href: "/admin/parents", icon: UsersRound, permission: "parents.view" },
    { key: "staff", href: "/admin/staff", icon: UserCog, permission: "staff.view" },
    { key: "roles", href: "/admin/roles", icon: ShieldCheck, permission: "roles.manage" },
    {
      key: "attendance",
      href: "/admin/attendance",
      icon: CalendarCheck,
      permission: "attendance.view",
    },
    {
      key: "exams",
      href: "/admin/exams",
      icon: ClipboardList,
      permission: "exams.view",
      feature: "exams",
    },
    { key: "grades", href: "/admin/grades", icon: Trophy, permission: "grades.view" },
    {
      key: "reports",
      href: "/admin/reports",
      icon: FileText,
      permission: "reports.view",
      feature: "monthly_reports",
    },
    { key: "settings", href: "/admin/settings", icon: Settings, permission: "settings.branding" },
  ],
  teacher: [
    { key: "dashboard", href: "/teacher", icon: LayoutDashboard },
    { key: "my_classes", href: "/teacher/classes", icon: Layers },
    { key: "schedule", href: "/teacher/schedule", icon: CalendarClock },
    { key: "attendance", href: "/teacher/attendance", icon: CalendarCheck },
    { key: "homework", href: "/teacher/homework", icon: NotebookPen, feature: "homework" },
    { key: "exams", href: "/teacher/exams", icon: ClipboardList, feature: "exams" },
    { key: "grades", href: "/teacher/grades", icon: Trophy },
    { key: "reports", href: "/teacher/reports", icon: FileText, feature: "monthly_reports" },
  ],
  student: [
    { key: "dashboard", href: "/student", icon: LayoutDashboard },
    { key: "my_subjects", href: "/student/subjects", icon: BookOpen },
    { key: "schedule", href: "/student/schedule", icon: CalendarClock },
    { key: "attendance", href: "/student/attendance", icon: CalendarCheck },
    { key: "homework", href: "/student/homework", icon: NotebookPen, feature: "homework" },
    { key: "exams", href: "/student/exams", icon: ClipboardList, feature: "exams" },
    { key: "my_grades", href: "/student/grades", icon: Trophy },
  ],
};
