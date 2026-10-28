import { describe, expect, it, vi } from "vitest";
import { AppError, type CreateSchoolInput } from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import type { Services } from "../index";
import { createAdminServices } from "./index";

const INPUT: CreateSchoolInput = {
  name: "مدرسة النور",
  slug: "al-noor",
  features: ["homework"],
  admin: { fullName: "مدير", email: "admin@al-noor.test", password: "Password1234" },
};

function setup({
  createSchool = vi.fn().mockResolvedValue("school-1"),
  createUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
} = {}) {
  const removeSchool = vi.fn().mockResolvedValue(undefined);
  const services = {
    schools: { create: createSchool, remove: removeSchool },
  } as unknown as Services;
  const adminClient = {
    auth: { admin: { createUser } },
  } as unknown as TypedSupabaseClient;
  return { admin: createAdminServices(adminClient), services, createUser, removeSchool };
}

describe("createSchoolWithAdmin", () => {
  it("creates the school, then its admin with role + school in app_metadata", async () => {
    const { admin, services, createUser } = setup();

    await expect(admin.createSchoolWithAdmin(services, INPUT)).resolves.toBe("school-1");
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: INPUT.admin.email,
        email_confirm: true,
        app_metadata: { role: "school_admin", school_id: "school-1" },
      }),
    );
  });

  it("reports a taken slug on the slug field", async () => {
    const { admin, services, createUser } = setup({
      createSchool: vi.fn().mockRejectedValue({ code: "23505", message: "duplicate key" }),
    });

    const error = await admin.createSchoolWithAdmin(services, INPUT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "conflict",
      fieldErrors: { slug: "errors.slug_taken" },
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rolls the school back and flags the email field when the email exists", async () => {
    const { admin, services, removeSchool } = setup({
      createUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { name: "AuthApiError", code: "email_exists", status: 422, message: "exists" },
      }),
    });

    const error = await admin.createSchoolWithAdmin(services, INPUT).catch((e: unknown) => e);
    expect(error).toMatchObject({ fieldErrors: { "admin.email": "errors.email_exists" } });
    expect(removeSchool).toHaveBeenCalledWith("school-1");
  });

  it("passes other failures through untouched and still rolls back", async () => {
    const { admin, services, removeSchool } = setup({
      createUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { name: "AuthRetryableFetchError", message: "fetch failed" },
      }),
    });

    const error = await admin.createSchoolWithAdmin(services, INPUT).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "network" });
    expect((error as AppError).fieldErrors).toBeUndefined();
    expect(removeSchool).toHaveBeenCalledWith("school-1");
  });
});
