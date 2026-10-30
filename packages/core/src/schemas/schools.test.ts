import { describe, expect, it } from "vitest";
import {
  brandingSchema,
  createSchoolSchema,
  schoolSettingsSchema,
  schoolSlugSchema,
} from "./schools";

describe("schoolSlugSchema", () => {
  it("accepts valid lowercased dashed slugs", () => {
    expect(schoolSlugSchema.safeParse("future-academy").success).toBe(true);
    expect(schoolSlugSchema.safeParse("school123").success).toBe(true);
  });

  it("normalizes uppercase and trims spaces", () => {
    const res = schoolSlugSchema.safeParse("  AL-NOOR-SCHOOL  ");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBe("al-noor-school");
    }
  });

  it("rejects invalid characters, spaces, or consecutive dashes", () => {
    expect(schoolSlugSchema.safeParse("school name").success).toBe(false);
    expect(schoolSlugSchema.safeParse("school--name").success).toBe(false);
    expect(schoolSlugSchema.safeParse("sc").success).toBe(false); // min length is 3
  });
});

describe("brandingSchema", () => {
  it("accepts valid 6-character hex colors", () => {
    const res = brandingSchema.safeParse({
      primaryColor: "#0284c7",
      secondaryColor: "#0f172a",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid colors or named colors", () => {
    expect(
      brandingSchema.safeParse({
        primaryColor: "blue",
        secondaryColor: "#0f172a",
      }).success,
    ).toBe(false);
  });
});

describe("schoolSettingsSchema", () => {
  it("accepts valid school settings with timezone and colors", () => {
    const res = schoolSettingsSchema.safeParse({
      name: "Al-Amal School",
      timezone: "Africa/Cairo",
      primaryColor: "#2563eb",
      secondaryColor: "#1e293b",
    });
    expect(res.success).toBe(true);
  });
});

describe("createSchoolSchema", () => {
  it("validates full school creation with initial admin credentials", () => {
    const res = createSchoolSchema.safeParse({
      name: "Modern International School",
      slug: "modern-intl",
      features: ["homework", "exams", "online_exams"],
      admin: {
        fullName: "Dr. Ahmed Hassan",
        email: "principal@modern-intl.edu",
        password: "SecurePassword123!",
      },
    });
    expect(res.success).toBe(true);
  });
});
