"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, History, Search, Trash2, Wallet } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  PAYMENT_METHODS,
  paymentSchema,
  type PaymentFormValues,
  type PaymentInput,
  type StudentBalance,
} from "@madrasty/core";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { IconAction } from "@/components/shared/IconAction";
import { StatCard } from "@/components/shared/StatCard";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBalances,
  useDeletePayment,
  usePayments,
  useRecordPayment,
} from "@/hooks/queries/finance/useFinance";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission, useSession } from "@/hooks/useSession";
import { localDate, todayIn } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { cn, notifyError, notifySuccess } from "@/lib/utils";

/** Every student's due / paid / remaining for the year, with payment recording and history. */
export function BalancesPanel({ yearId }: { yearId: string }) {
  const t = useTranslations("finance.balances");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission("finance.manage");
  const balances = useBalances(yearId);
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<StudentBalance | null>(null);
  const [history, setHistory] = useState<StudentBalance | null>(null);

  const money = (value: number) => format.number(value, { maximumFractionDigits: 2 });
  const all = balances.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = q ? all.filter((r) => r.fullName.toLowerCase().includes(q) || r.className.includes(q)) : all;
  const totals = all.reduce(
    (sum, r) => ({ due: sum.due + r.due, paid: sum.paid + r.paid }),
    { due: 0, paid: 0 },
  );

  const columns: EntityColumn<StudentBalance>[] = [
    {
      key: "name",
      header: t("student"),
      cell: (row) => (
        <div>
          <p className="font-medium">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.className}</p>
        </div>
      ),
    },
    {
      key: "due",
      header: t("due"),
      className: "text-end tabular-nums",
      cell: (row) => <span className="tabular-nums">{money(row.due)}</span>,
    },
    {
      key: "paid",
      header: t("paid"),
      className: "text-end tabular-nums",
      cell: (row) => <span className="tabular-nums">{money(row.paid)}</span>,
    },
    {
      key: "balance",
      header: t("remaining"),
      className: "text-end tabular-nums",
      cell: (row) => {
        const remaining = row.due - row.paid;
        return (
          <span className={cn("font-semibold tabular-nums", remaining > 0 ? "text-destructive" : "text-success")}>
            {money(remaining)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("total_due")} value={money(totals.due)} icon={Wallet} isLoading={balances.isLoading} />
        <StatCard label={t("total_paid")} value={money(totals.paid)} icon={Banknote} isLoading={balances.isLoading} />
        <StatCard
          label={t("total_remaining")}
          value={money(totals.due - totals.paid)}
          icon={History}
          isLoading={balances.isLoading}
        />
      </div>
      <div className="relative max-w-sm">
        <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={tc("search")}
          className="ps-9"
        />
      </div>
      {balances.isError ? (
        <EmptyState icon={Wallet} title={toMessage(balances.error)} />
      ) : !balances.isLoading && rows.length === 0 ? (
        <EmptyState icon={Wallet} title={t("empty")} />
      ) : (
        <EntityTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.studentId}
          isLoading={balances.isLoading}
          actionsLabel={tc("actions")}
          actions={(row) => (
            <>
              <IconAction icon={History} label={t("history")} onClick={() => setHistory(row)} />
              {canManage && <IconAction icon={Banknote} label={t("record")} onClick={() => setPaying(row)} />}
            </>
          )}
        />
      )}

      <PaymentFormDialog key={paying?.studentId ?? "none"} yearId={yearId} student={paying} onClose={() => setPaying(null)} />
      <PaymentsDialog yearId={yearId} student={history} canManage={canManage} onClose={() => setHistory(null)} />
    </div>
  );
}

function PaymentFormDialog({
  yearId,
  student,
  onClose,
}: {
  yearId: string;
  student: StudentBalance | null;
  onClose: () => void;
}) {
  const t = useTranslations("finance.balances");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { school } = useSession();
  const record = useRecordPayment();
  const remaining = student ? Math.max(0, student.due - student.paid) : 0;
  const defaults: PaymentFormValues = {
    amount: remaining > 0 ? String(remaining) : "",
    paidOn: todayIn(school?.timezone ?? "UTC"),
    method: "cash",
    reference: "",
    note: "",
  };
  const form = useForm<PaymentFormValues, unknown, PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: defaults,
  });

  const onSubmit = form.handleSubmit((input) => {
    if (!student) return;
    record.mutate(
      { yearId, studentId: student.studentId, input },
      {
        onSuccess: () => {
          notifySuccess(t("recorded"));
          onClose();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    );
  });

  return (
    <FormDialog
      open={Boolean(student)}
      onOpenChange={(next) => !next && onClose()}
      title={t("record_title", { name: student?.fullName ?? "" })}
      description={t("remaining_now", { amount: format.number(remaining, { maximumFractionDigits: 2 }) })}
      formId="payment-form"
      isPending={record.isPending}
    >
      <form id="payment-form" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="amount" label={t("amount")} type="number" inputMode="decimal" dir="ltr" autoFocus />
            <TextField control={form.control} name="paidOn" label={t("paid_on")} type="date" dir="ltr" />
          </div>
          <SelectField
            control={form.control}
            name="method"
            label={t("method")}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
          />
          <TextField control={form.control} name="reference" label={t("reference")} dir="ltr" />
          <TextField control={form.control} name="note" label={t("note")} />
          {record.isError && !hasFieldErrors(record.error) && <FieldError>{toMessage(record.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}

function PaymentsDialog({
  yearId,
  student,
  canManage,
  onClose,
}: {
  yearId: string;
  student: StudentBalance | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("finance.balances");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const payments = usePayments(student?.studentId, yearId);
  const remove = useDeletePayment();

  return (
    <Dialog open={Boolean(student)} onOpenChange={(next) => !next && onClose()}>
      <AppDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("history_title", { name: student?.fullName ?? "" })}</DialogTitle>
          <DialogDescription>{student?.className}</DialogDescription>
        </DialogHeader>
        {payments.isLoading ? (
          <Skeleton className="h-24" />
        ) : (payments.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("no_payments")}</p>
        ) : (
          <ul className="divide-y">
            {(payments.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums">{format.number(p.amount, { maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(localDate(p.paidOn), { dateStyle: "medium" })} · {t(`methods.${p.method}`)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                </div>
                {canManage && (
                  <IconAction
                    icon={Trash2}
                    label={tc("delete")}
                    destructive
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(p.id, {
                        onSuccess: () => notifySuccess(tc("deleted")),
                        onError: (error) => notifyError(toMessage(error)),
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
