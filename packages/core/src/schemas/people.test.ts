import { describe, expect, it } from "vitest";
import { passwordSchema } from "./auth";
import { createPersonSchema, generateTemporaryPassword, updatePersonSchema } from "./people";

const base = {
  fullName: "أحمد محمد",
  email: "Ahmed@School.test ",
  phone: "",
  password: "Password1234",
};

describe("createPersonSchema", () => {
  it("normalizes the email and accepts an empty phone", () => {
    const parsed = createPersonSchema.parse({ role: "teacher", ...base });
    expect(parsed.email).toBe("ahmed@school.test");
  });

  it("requires role-specific fields", () => {
    expect(createPersonSchema.safeParse({ role: "student", ...base }).success).toBe(false);
    expect(createPersonSchema.safeParse({ role: "student", ...base, classId: "" }).success).toBe(
      true,
    );
    expect(createPersonSchema.safeParse({ role: "parent", ...base, studentIds: [] }).success).toBe(
      true,
    );
  });

  it("rejects roles that cannot be created from the school portal", () => {
    expect(createPersonSchema.safeParse({ role: "school_admin", ...base }).success).toBe(false);
  });
});

describe("updatePersonSchema", () => {
  it("validates phone numbers", () => {
    expect(
      updatePersonSchema.safeParse({ fullName: "سارة", phone: "+970 59-123-4567" }).success,
    ).toBe(true);
    expect(updatePersonSchema.safeParse({ fullName: "سارة", phone: "abc" }).success).toBe(false);
  });
});

describe("generateTemporaryPassword", () => {
  it("always satisfies the password policy", () => {
    for (let i = 0; i < 200; i++) {
      expect(passwordSchema.safeParse(generateTemporaryPassword()).success).toBe(true);
    }
  });

  it("avoids ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTemporaryPassword()).not.toMatch(/[0O1lI]/);
    }
  });
});
