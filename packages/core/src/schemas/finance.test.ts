import { describe, expect, it } from "vitest";
import {
  feeItemSchema,
  paymentSchema,
  planSchema,
  subscriptionSchema,
  transactionSchema,
} from "./finance";

describe("feeItemSchema", () => {
  it("accepts valid fee item with grade and due date", () => {
    const res = feeItemSchema.safeParse({
      name: "Tuition Term 1",
      amount: "1500.50",
      gradeLevelId: "a0000000-0000-4000-8000-000000000001",
      dueOn: "2026-10-01",
    });
    expect(res.success).toBe(true);
  });

  it("accepts empty grade and due date for all-grade ongoing fee", () => {
    const res = feeItemSchema.safeParse({
      name: "General Activity Fee",
      amount: 100,
      gradeLevelId: "",
      dueOn: "",
    });
    expect(res.success).toBe(true);
  });

  it("rejects zero or negative fee amounts", () => {
    const zeroRes = feeItemSchema.safeParse({
      name: "Free Fee",
      amount: 0,
      gradeLevelId: "",
      dueOn: "",
    });
    expect(zeroRes.success).toBe(false);

    const negRes = feeItemSchema.safeParse({
      name: "Negative Fee",
      amount: -50,
      gradeLevelId: "",
      dueOn: "",
    });
    expect(negRes.success).toBe(false);
  });
});

describe("paymentSchema", () => {
  it("accepts valid payment recording", () => {
    const res = paymentSchema.safeParse({
      amount: 500,
      paidOn: "2026-10-15",
      method: "cash",
      reference: "REC-1002",
      note: "Paid in full at office",
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown payment method", () => {
    const res = paymentSchema.safeParse({
      amount: 100,
      paidOn: "2026-10-15",
      method: "crypto",
      reference: "",
      note: "",
    });
    expect(res.success).toBe(false);
  });
});

describe("planSchema", () => {
  it("accepts valid subscription plan with features", () => {
    const res = planSchema.safeParse({
      name: "Enterprise School Plan",
      monthlyPrice: 299,
      yearlyPrice: 2990,
      features: ["homework", "exams", "online_exams", "monthly_reports"],
      isActive: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects plan with invalid feature keys", () => {
    const res = planSchema.safeParse({
      name: "Invalid Plan",
      monthlyPrice: 100,
      yearlyPrice: 1000,
      features: ["non_existent_feature" as any],
      isActive: true,
    });
    expect(res.success).toBe(false);
  });
});

describe("subscriptionSchema", () => {
  it("accepts valid subscription input", () => {
    const res = subscriptionSchema.safeParse({
      planId: "a0000000-0000-4000-8000-000000000001",
      cycle: "yearly",
      startsOn: "2026-11-01",
    });
    expect(res.success).toBe(true);
  });
});

describe("transactionSchema", () => {
  it("accepts valid transaction", () => {
    const res = transactionSchema.safeParse({
      kind: "income",
      amount: 1200,
      occurredOn: "2026-10-01",
      description: "Monthly School SaaS subscription fee",
    });
    expect(res.success).toBe(true);
  });
});
