import { describe, expect, it } from "vitest";
import { toAppError } from "./errors";

describe("toAppError", () => {
  it("maps a deactivated (banned) account to account_disabled", () => {
    const error = toAppError({ name: "AuthApiError", code: "user_banned", status: 400 });
    expect(error).toMatchObject({ code: "forbidden", message: "errors.account_disabled" });
  });

  it("maps the access-token hook refusal to account_disabled", () => {
    const error = toAppError({ name: "AuthApiError", message: "account_disabled", status: 403 });
    expect(error.message).toBe("errors.account_disabled");
  });

  it("maps a still-referenced row to an in-use conflict", () => {
    expect(toAppError({ code: "23503" })).toMatchObject({
      code: "conflict",
      message: "errors.in_use",
    });
  });

  it("never leaks unknown backend messages", () => {
    expect(toAppError({ message: "relation secret_table does not exist" }).message).toBe(
      "errors.unknown",
    );
  });
});
