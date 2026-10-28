"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Pencil, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { FEATURE_KEYS, planSchema, type Plan, type PlanFormValues, type PlanInput } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { IconAction } from "@/components/shared/IconAction";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TextField } from "@/components/shared/form/TextField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { usePlans, useSavePlan } from "@/hooks/queries/finance/useFinance";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

/** Platform → Plans: prices per cycle and the features a plan turns on for a school. */
export function PlansPageClient() {
  const t = useTranslations("platform.plans");
  const tf = useTranslations("features");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const plans = usePlans();
  const dialogs = useCrudDialogs<Plan>();
  const money = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  const columns: EntityColumn<Plan>[] = [
    { key: "name", header: t("name"), cell: (p) => <span className="font-medium">{p.name}</span> },
    { key: "monthly", header: t("monthly_price"), cell: (p) => <span className="tabular-nums">{money(p.monthlyPrice)}</span> },
    { key: "yearly", header: t("yearly_price"), cell: (p) => <span className="tabular-nums">{money(p.yearlyPrice)}</span> },
    {
      key: "features",
      header: t("features"),
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.features.map((f) => (
            <Badge key={f} variant="secondary">
              {tf(f)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: t("status"),
      cell: (p) =>
        p.isActive ? <StatusBadge tone="success" label={t("active")} /> : <StatusBadge tone="muted" label={t("inactive")} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={dialogs.openCreate}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      {plans.isError ? (
        <EmptyState icon={Package} title={toMessage(plans.error)} />
      ) : !plans.isLoading && (plans.data ?? []).length === 0 ? (
        <EmptyState icon={Package} title={t("empty")} />
      ) : (
        <EntityTable
          rows={plans.data ?? []}
          columns={columns}
          rowKey={(p) => p.id}
          isLoading={plans.isLoading}
          actionsLabel={tc("actions")}
          actions={(p) => <IconAction icon={Pencil} label={tc("edit")} onClick={() => dialogs.openEdit(p)} />}
        />
      )}
      <PlanFormDialog key={dialogs.editing?.id ?? "new"} open={dialogs.formOpen} onOpenChange={dialogs.setFormOpen} plan={dialogs.editing} />
    </>
  );
}

function PlanFormDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}) {
  const t = useTranslations("platform.plans");
  const tf = useTranslations("features");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSavePlan();
  const defaults: PlanFormValues = {
    name: plan?.name ?? "",
    monthlyPrice: plan ? String(plan.monthlyPrice) : "",
    yearlyPrice: plan ? String(plan.yearlyPrice) : "",
    features: plan?.features ?? ["homework", "exams", "monthly_reports", "parent_app"],
    isActive: plan?.isActive ?? true,
  };
  const form = useForm<PlanFormValues, unknown, PlanInput>({ resolver: zodResolver(planSchema), defaultValues: defaults });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { input, id: plan?.id },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={plan ? t("edit_title") : t("create_title")}
      formId="plan-form"
      isPending={save.isPending}
      className="sm:max-w-xl"
    >
      <form id="plan-form" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField control={form.control} name="name" label={t("name")} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="monthlyPrice" label={t("monthly_price")} type="number" inputMode="decimal" dir="ltr" />
            <TextField control={form.control} name="yearlyPrice" label={t("yearly_price")} type="number" inputMode="decimal" dir="ltr" />
          </div>
          <Controller
            control={form.control}
            name="features"
            render={({ field }) => (
              <Field>
                <FieldTitle>{t("features")}</FieldTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FEATURE_KEYS.map((key) => (
                    <Field key={key} orientation="horizontal">
                      <Checkbox
                        id={`plan-feature-${key}`}
                        checked={field.value.includes(key)}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? [...field.value, key] : field.value.filter((k) => k !== key))
                        }
                      />
                      <FieldLabel htmlFor={`plan-feature-${key}`} className="font-normal">
                        {tf(key)}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox id="plan-active" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                <FieldLabel htmlFor="plan-active" className="font-normal">
                  {t("active_hint")}
                </FieldLabel>
              </Field>
            )}
          />
          {save.isError && !hasFieldErrors(save.error) && <FieldError>{toMessage(save.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
