import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a pasted email with surrounding spaces and normalizes it", () => {
    const parsed = loginSchema.parse({ email: "  Admin@School.Test ", password: "x" });
    expect(parsed.email).toBe("admin@school.test");
  });

  it("still rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts 8+ characters with a letter and a digit", () => {
    expect(passwordSchema.safeParse("12345678a").success).toBe(true);
  });

  it("rejects short, digit-only or letter-only passwords", () => {
    expect(passwordSchema.safeParse("123456a").success).toBe(false);
    expect(passwordSchema.safeParse("123456789").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefghi").success).toBe(false);
  });
});
