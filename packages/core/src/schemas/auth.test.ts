import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a pasted email with surrounding spaces and normalizes it", () => {
    const parsed = loginSchema.parse({ email: "  Admin@School.Test ", password: "x" });
    expect(parsed.email).toBe("admin@school.test");
  });

  it("still rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});
