import {
  AppError,
  isFeatureKey,
  type FeeItem,
  type FeeItemInput,
  type FeePayment,
  type PaymentInput,
  type Plan,
  type PlanInput,
  type PlatformFinanceSummary,
  type PlatformTransaction,
  type SchoolSubscription,
  type StudentBalance,
  type SubscriptionInput,
  type TransactionInput,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";

function nameTaken(error: unknown): AppError {
  const appError = toAppError(error);
  return appError.code === "conflict" && appError.message === "errors.conflict"
    ? new AppError("conflict", "errors.name_taken", { name: "errors.name_taken" })
    : appError;
}

/**
 * School fees and payments (finance.view / finance.manage) and the platform's own books
 * (plans, subscriptions, transactions — platform owner only). RLS enforces both.
 */
export function createFinanceService(client: TypedSupabaseClient) {
  return {
    // ------------------------------------------------------------ school
    async listFeeItems(yearId: string): Promise<FeeItem[]> {
      const rows = unwrap(
        await client
          .from("fee_items")
          .select("id, name, amount, grade_level_id, due_on, grade:grade_levels!fee_items_grade_fkey(name)")
          .eq("academic_year_id", yearId)
          .order("created_at"),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        amount: Number(row.amount),
        gradeLevelId: row.grade_level_id,
        gradeLevelName: row.grade?.name ?? null,
        dueOn: row.due_on,
      }));
    },

    async saveFeeItem(schoolId: string, yearId: string, input: FeeItemInput, id?: string): Promise<void> {
      const values = {
        name: input.name,
        amount: input.amount,
        grade_level_id: input.gradeLevelId || null,
        due_on: input.dueOn || null,
      };
      if (id) {
        const rows = unwrap(await client.from("fee_items").update(values).eq("id", id).select("id"));
        if (rows.length === 0) throw new AppError("not_found");
      } else {
        unwrap(
          await client
            .from("fee_items")
            .insert({ ...values, school_id: schoolId, academic_year_id: yearId }),
        );
      }
    },

    async deleteFeeItem(id: string): Promise<void> {
      const rows = unwrap(await client.from("fee_items").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("not_found");
    },

    async listBalances(yearId: string): Promise<StudentBalance[]> {
      const rows = unwrap(await client.rpc("student_balances", { p_year_id: yearId }));
      return rows.map((row) => ({
        studentId: row.student_id,
        fullName: row.full_name,
        classId: row.class_id,
        className: row.class_name,
        due: Number(row.due),
        paid: Number(row.paid),
      }));
    },

    async listPayments(studentId: string, yearId: string): Promise<FeePayment[]> {
      const rows = unwrap(
        await client
          .from("fee_payments")
          .select("id, student_id, amount, paid_on, method, reference, note")
          .eq("student_id", studentId)
          .eq("academic_year_id", yearId)
          .order("paid_on", { ascending: false }),
      );
      return rows.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        amount: Number(row.amount),
        paidOn: row.paid_on,
        method: row.method,
        reference: row.reference,
        note: row.note,
      }));
    },

    async recordPayment(schoolId: string, yearId: string, studentId: string, input: PaymentInput) {
      unwrap(
        await client.from("fee_payments").insert({
          school_id: schoolId,
          academic_year_id: yearId,
          student_id: studentId,
          amount: input.amount,
          paid_on: input.paidOn,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
        }),
      );
    },

    async deletePayment(id: string): Promise<void> {
      const rows = unwrap(await client.from("fee_payments").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("not_found");
    },

    // ---------------------------------------------------------- platform
    async listPlans(): Promise<Plan[]> {
      const rows = unwrap(
        await client
          .from("plans")
          .select("id, name, monthly_price, yearly_price, features, is_active")
          .order("monthly_price"),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        monthlyPrice: Number(row.monthly_price),
        yearlyPrice: Number(row.yearly_price),
        features: row.features.filter(isFeatureKey),
        isActive: row.is_active,
      }));
    },

    async savePlan(input: PlanInput, id?: string): Promise<void> {
      const values = {
        name: input.name,
        monthly_price: input.monthlyPrice,
        yearly_price: input.yearlyPrice,
        features: input.features,
        is_active: input.isActive,
      };
      try {
        if (id) {
          const rows = unwrap(await client.from("plans").update(values).eq("id", id).select("id"));
          if (rows.length === 0) throw new AppError("not_found");
        } else {
          unwrap(await client.from("plans").insert(values));
        }
      } catch (error) {
        throw nameTaken(error);
      }
    },

    async listSubscriptions(schoolId?: string): Promise<SchoolSubscription[]> {
      let query = client
        .from("school_subscriptions")
        .select("id, school_id, cycle, starts_on, ends_on, amount, school:schools(name), plan:plans(name)")
        .order("ends_on", { ascending: false });
      if (schoolId) query = query.eq("school_id", schoolId);
      return unwrap(await query).map((row) => ({
        id: row.id,
        schoolId: row.school_id,
        schoolName: row.school.name,
        planName: row.plan.name,
        cycle: row.cycle,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        amount: Number(row.amount),
      }));
    },

    async subscribe(schoolId: string, input: SubscriptionInput): Promise<void> {
      unwrap(
        await client.rpc("subscribe_school", {
          p_school_id: schoolId,
          p_plan_id: input.planId,
          p_cycle: input.cycle,
          p_starts_on: input.startsOn,
        }),
      );
    },

    async listTransactions(): Promise<PlatformTransaction[]> {
      const rows = unwrap(
        await client
          .from("platform_transactions")
          .select("id, kind, amount, occurred_on, description, school:schools(name)")
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
      );
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        amount: Number(row.amount),
        occurredOn: row.occurred_on,
        schoolName: row.school?.name ?? null,
        description: row.description,
      }));
    },

    async addTransaction(input: TransactionInput): Promise<void> {
      unwrap(
        await client.from("platform_transactions").insert({
          kind: input.kind,
          amount: input.amount,
          occurred_on: input.occurredOn,
          description: input.description,
        }),
      );
    },

    async summary(): Promise<PlatformFinanceSummary> {
      const raw = unwrap(await client.rpc("platform_finance_summary")) as Record<string, unknown>;
      return {
        income: Number(raw.income ?? 0),
        commission: Number(raw.commission ?? 0),
        expense: Number(raw.expense ?? 0),
        expiring: Number(raw.expiring ?? 0),
      };
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
