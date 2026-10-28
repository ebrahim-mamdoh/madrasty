"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FeeItemInput,
  PaymentInput,
  PlanInput,
  SubscriptionInput,
  TransactionInput,
} from "@madrasty/core";
import { schoolsQueryKey } from "@/hooks/queries/schools/useSchools";
import { useSchoolId } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const financeQueryKey = ["finance"] as const;

const finance = () => getBrowserServices().finance;

function useFinanceMutation<TVariables>(run: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    // Subscriptions change school features too, so the schools cache refreshes as well.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: financeQueryKey }),
        queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
      ]),
  });
}

// ------------------------------------------------------------- school
export function useFeeItems(yearId: string | undefined) {
  return useQuery({
    queryKey: [...financeQueryKey, "fees", yearId ?? ""],
    queryFn: () => finance().listFeeItems(yearId!),
    enabled: Boolean(yearId),
  });
}

export function useBalances(yearId: string | undefined) {
  return useQuery({
    queryKey: [...financeQueryKey, "balances", yearId ?? ""],
    queryFn: () => finance().listBalances(yearId!),
    enabled: Boolean(yearId),
    placeholderData: keepPreviousData,
  });
}

export function usePayments(studentId: string | undefined, yearId: string | undefined) {
  return useQuery({
    queryKey: [...financeQueryKey, "payments", studentId ?? "", yearId ?? ""],
    queryFn: () => finance().listPayments(studentId!, yearId!),
    enabled: Boolean(studentId && yearId),
  });
}

export function useSaveFeeItem() {
  const schoolId = useSchoolId();
  return useFinanceMutation(
    ({ yearId, input, id }: { yearId: string; input: FeeItemInput; id?: string }) =>
      finance().saveFeeItem(schoolId, yearId, input, id),
  );
}

export function useDeleteFeeItem() {
  return useFinanceMutation((id: string) => finance().deleteFeeItem(id));
}

export function useRecordPayment() {
  const schoolId = useSchoolId();
  return useFinanceMutation(
    ({ yearId, studentId, input }: { yearId: string; studentId: string; input: PaymentInput }) =>
      finance().recordPayment(schoolId, yearId, studentId, input),
  );
}

export function useDeletePayment() {
  return useFinanceMutation((id: string) => finance().deletePayment(id));
}

// ----------------------------------------------------------- platform
export function usePlans() {
  return useQuery({ queryKey: [...financeQueryKey, "plans"], queryFn: () => finance().listPlans() });
}

export function useSavePlan() {
  return useFinanceMutation(({ input, id }: { input: PlanInput; id?: string }) =>
    finance().savePlan(input, id),
  );
}

export function useSubscriptions(schoolId?: string) {
  return useQuery({
    queryKey: [...financeQueryKey, "subscriptions", schoolId ?? "all"],
    queryFn: () => finance().listSubscriptions(schoolId),
  });
}

export function useSubscribeSchool() {
  return useFinanceMutation(({ schoolId, input }: { schoolId: string; input: SubscriptionInput }) =>
    finance().subscribe(schoolId, input),
  );
}

export function useTransactions() {
  return useQuery({
    queryKey: [...financeQueryKey, "transactions"],
    queryFn: () => finance().listTransactions(),
  });
}

export function useAddTransaction() {
  return useFinanceMutation((input: TransactionInput) => finance().addTransaction(input));
}

export function usePlatformFinance() {
  return useQuery({ queryKey: [...financeQueryKey, "summary"], queryFn: () => finance().summary() });
}
