"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  feeItemSchema,
  type FeeItem,
  type FeeItemFormValues,
  type FeeItemInput,
} from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { IconAction } from "@/components/shared/IconAction";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useDeleteFeeItem, useFeeItems, useSaveFeeItem } from "@/hooks/queries/finance/useFinance";
import { useGradeLevels } from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { localDate } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifyError, notifySuccess } from "@/lib/utils";

/** What students owe this year: for every grade or for one grade level. */
export function FeeItemsPanel({ yearId }: { yearId: string }) {
  const t = useTranslations("finance.fees");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission("finance.manage");
  const fees = useFeeItems(yearId);
  const remove = useDeleteFeeItem();
  const dialogs = useCrudDialogs<FeeItem>();

  const rows = fees.data ?? [];
  const columns: EntityColumn<FeeItem>[] = [
    { key: "name", header: t("name"), cell: (fee) => <span className="font-medium">{fee.name}</span> },
    {
      key: "amount",
      header: t("amount"),
      cell: (fee) => <span className="tabular-nums">{format.number(fee.amount, { maximumFractionDigits: 2 })}</span>,
    },
    {
      key: "grade",
      header: t("applies_to"),
      cell: (fee) => fee.gradeLevelName ?? <span className="text-muted-foreground">{t("all_grades")}</span>,
    },
    {
      key: "due",
      header: t("due_on"),
      cell: (fee) =>
        fee.dueOn ? format.dateTime(localDate(fee.dueOn), { dateStyle: "medium" }) : <span className="text-muted-foreground">—</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={dialogs.openCreate}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        </div>
      )}
      {fees.isError ? (
        <EmptyState icon={Receipt} title={toMessage(fees.error)} />
      ) : !fees.isLoading && rows.length === 0 ? (
        <EmptyState icon={Receipt} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={rows}
          columns={columns}
          rowKey={(fee) => fee.id}
          isLoading={fees.isLoading}
          actionsLabel={tc("actions")}
          actions={
            canManage
              ? (fee) => (
                  <>
                    <IconAction icon={Pencil} label={tc("edit")} onClick={() => dialogs.openEdit(fee)} />
                    <IconAction icon={Trash2} label={tc("delete")} destructive onClick={() => dialogs.askDelete(fee)} />
                  </>
                )
              : undefined
          }
        />
      )}

      <FeeItemFormDialog
        key={dialogs.editing?.id ?? "new"}
        yearId={yearId}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        fee={dialogs.editing}
      />
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("delete_title")}
        description={t("delete_description", { name: dialogs.deleting?.name ?? "" })}
        isPending={remove.isPending}
        onConfirm={() =>
          dialogs.deleting &&
          remove.mutate(dialogs.deleting.id, {
            onSuccess: () => notifySuccess(tc("deleted")),
            onError: (error) => notifyError(toMessage(error)),
            onSettled: dialogs.closeDelete,
          })
        }
      />
    </div>
  );
}

function FeeItemFormDialog({
  yearId,
  open,
  onOpenChange,
  fee,
}: {
  yearId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: FeeItem | null;
}) {
  const t = useTranslations("finance.fees");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const grades = useGradeLevels();
  const save = useSaveFeeItem();
  const defaults: FeeItemFormValues = {
    name: fee?.name ?? "",
    amount: fee ? String(fee.amount) : "",
    gradeLevelId: fee?.gradeLevelId ?? "",
    dueOn: fee?.dueOn ?? "",
  };
  const form = useForm<FeeItemFormValues, unknown, FeeItemInput>({
    resolver: zodResolver(feeItemSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { yearId, input, id: fee?.id },
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
      title={fee ? t("edit_title") : t("create_title")}
      formId="fee-item-form"
      isPending={save.isPending}
    >
      <form id="fee-item-form" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField control={form.control} name="name" label={t("name")} placeholder={t("name_placeholder")} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="amount" label={t("amount")} type="number" inputMode="decimal" dir="ltr" />
            <TextField control={form.control} name="dueOn" label={t("due_on")} type="date" dir="ltr" />
          </div>
          <SelectField
            control={form.control}
            name="gradeLevelId"
            label={t("applies_to")}
            emptyOptionLabel={t("all_grades")}
            options={(grades.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
          />
          {save.isError && !hasFieldErrors(save.error) && <FieldError>{toMessage(save.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
