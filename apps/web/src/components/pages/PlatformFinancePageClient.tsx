"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, CalendarClock, Plus, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  TRANSACTION_KINDS,
  transactionSchema,
  type PlatformTransaction,
  type SchoolSubscription,
  type TransactionFormValues,
  type TransactionInput,
} from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddTransaction,
  usePlatformFinance,
  useSubscriptions,
  useTransactions,
} from "@/hooks/queries/finance/useFinance";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";
import { Link } from "@/i18n/navigation";
import { localDate } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { cn, notifySuccess } from "@/lib/utils";

/** Platform → Finance: this month's money, every subscription, and the ledger. */
export function PlatformFinancePageClient() {
  const t = useTranslations("platform.finance");
  const ts = useTranslations("platform.subscription");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { searchParams, setParams } = useUrlState();
  const tab = searchParams.get("tab") === "ledger" ? "ledger" : "subscriptions";
  const summary = usePlatformFinance();
  const subscriptions = useSubscriptions();
  const transactions = useTransactions();
  const [adding, setAdding] = useState(false);
  const money = (v: number | undefined) => (v === undefined ? undefined : format.number(v, { maximumFractionDigits: 2 }));
  const day = (d: string) => format.dateTime(localDate(d), { dateStyle: "medium" });

  const subscriptionColumns: EntityColumn<SchoolSubscription>[] = [
    {
      key: "school",
      header: t("school"),
      cell: (s) => (
        <Link href={`/platform/schools/${s.schoolId}`} className="font-medium hover:underline">
          {s.schoolName}
        </Link>
      ),
    },
    { key: "plan", header: ts("plan"), cell: (s) => `${s.planName} · ${ts(`cycles.${s.cycle}`)}` },
    { key: "period", header: t("period"), cell: (s) => `${day(s.startsOn)} – ${day(s.endsOn)}` },
    { key: "amount", header: t("amount"), cell: (s) => <span className="tabular-nums">{money(s.amount)}</span> },
  ];

  const ledgerColumns: EntityColumn<PlatformTransaction>[] = [
    { key: "date", header: t("date"), cell: (x) => day(x.occurredOn) },
    { key: "kind", header: t("kind"), cell: (x) => t(`kinds.${x.kind}`) },
    {
      key: "description",
      header: t("description"),
      cell: (x) => (
        <div>
          <p>{x.description}</p>
          {x.schoolName && <p className="text-xs text-muted-foreground">{x.schoolName}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: t("amount"),
      cell: (x) => (
        <span className={cn("font-semibold tabular-nums", x.kind === "expense" ? "text-destructive" : "text-success")}>
          {x.kind === "expense" ? "−" : "+"}
          {money(x.amount)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("income")} value={money(summary.data?.income)} icon={TrendingUp} isLoading={summary.isLoading} />
        <StatCard label={t("commission")} value={money(summary.data?.commission)} icon={BadgeCheck} isLoading={summary.isLoading} />
        <StatCard label={t("expense")} value={money(summary.data?.expense)} icon={TrendingDown} isLoading={summary.isLoading} />
        <StatCard
          label={t("expiring")}
          value={summary.data ? format.number(summary.data.expiring) : undefined}
          icon={CalendarClock}
          isLoading={summary.isLoading}
        />
      </div>
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions">{t("tabs.subscriptions")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("tabs.ledger")}</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          {subscriptions.isError ? (
            <EmptyState icon={Receipt} title={toMessage(subscriptions.error)} />
          ) : !subscriptions.isLoading && (subscriptions.data ?? []).length === 0 ? (
            <EmptyState icon={Receipt} title={t("no_subscriptions")} description={t("no_subscriptions_hint")} />
          ) : (
            <EntityTable rows={subscriptions.data ?? []} columns={subscriptionColumns} rowKey={(s) => s.id} isLoading={subscriptions.isLoading} />
          )}
        </TabsContent>
        <TabsContent value="ledger">
          {transactions.isError ? (
            <EmptyState icon={Receipt} title={toMessage(transactions.error)} />
          ) : !transactions.isLoading && (transactions.data ?? []).length === 0 ? (
            <EmptyState icon={Receipt} title={t("no_transactions")} />
          ) : (
            <EntityTable rows={transactions.data ?? []} columns={ledgerColumns} rowKey={(x) => x.id} isLoading={transactions.isLoading} />
          )}
        </TabsContent>
      </Tabs>
      <TransactionDialog key={adding ? "open" : "closed"} open={adding} onOpenChange={setAdding} />
    </>
  );
}

function TransactionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("platform.finance");
  const toMessage = useErrorMessage();
  const add = useAddTransaction();
  const form = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { kind: "expense", amount: "", occurredOn: new Date().toISOString().slice(0, 10), description: "" },
  });

  const onSubmit = form.handleSubmit((input) =>
    add.mutate(input, {
      onSuccess: () => {
        notifySuccess(t("added"));
        onOpenChange(false);
      },
      onError: (error) => applyFieldErrors(form.setError, error),
    }),
  );

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("add_title")} formId="transaction-form" isPending={add.isPending}>
      <form id="transaction-form" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <SelectField
            control={form.control}
            name="kind"
            label={t("kind")}
            options={TRANSACTION_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="amount" label={t("amount")} type="number" inputMode="decimal" dir="ltr" autoFocus />
            <TextField control={form.control} name="occurredOn" label={t("date")} type="date" dir="ltr" />
          </div>
          <TextField control={form.control} name="description" label={t("description")} />
          {add.isError && !hasFieldErrors(add.error) && <FieldError>{toMessage(add.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
