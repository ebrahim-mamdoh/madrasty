import { z } from "zod";
import { FEATURE_KEYS } from "../features";

export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "online"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const TRANSACTION_KINDS = ["income", "expense", "commission"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

const money = (min: number) =>
  z.coerce
    .number<string | number>()
    .min(min, "validation.amount")
    .max(9_999_999, "validation.amount");
const isoDate = z.iso.date("validation.date");

/** Empty select → applies to every grade. */
export const feeItemSchema = z.object({
  name: z.string().trim().min(2, "validation.name_min").max(100, "validation.name_max"),
  amount: money(0.01),
  gradeLevelId: z.union([z.uuid(), z.literal("")]),
  dueOn: z.union([isoDate, z.literal("")]),
});

export type FeeItemInput = z.output<typeof feeItemSchema>;
export type FeeItemFormValues = z.input<typeof feeItemSchema>;

export const paymentSchema = z.object({
  amount: money(0.01),
  paidOn: isoDate,
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(100, "validation.name_max"),
  note: z.string().trim().max(300, "validation.text_max"),
});

export type PaymentInput = z.output<typeof paymentSchema>;
export type PaymentFormValues = z.input<typeof paymentSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(2, "validation.name_min").max(60, "validation.name_max"),
  monthlyPrice: money(0),
  yearlyPrice: money(0),
  features: z.array(z.enum(FEATURE_KEYS)),
  isActive: z.boolean(),
});

export type PlanInput = z.output<typeof planSchema>;
export type PlanFormValues = z.input<typeof planSchema>;

export const subscriptionSchema = z.object({
  planId: z.uuid("validation.required"),
  cycle: z.enum(BILLING_CYCLES),
  startsOn: isoDate,
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const transactionSchema = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  amount: money(0.01),
  occurredOn: isoDate,
  description: z.string().trim().min(2, "validation.name_min").max(200, "validation.name_max"),
});

export type TransactionInput = z.output<typeof transactionSchema>;
export type TransactionFormValues = z.input<typeof transactionSchema>;
