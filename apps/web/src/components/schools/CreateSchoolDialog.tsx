"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FEATURE_KEYS, createSchoolSchema, type CreateSchoolInput } from "@madrasty/core";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useCreateSchool } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const DEFAULT_VALUES: CreateSchoolInput = {
  name: "",
  slug: "",
  features: ["homework", "exams", "monthly_reports", "parent_app"],
  admin: { fullName: "", email: "", password: "" },
};

export function CreateSchoolDialog() {
  const t = useTranslations("platform.schools");
  const tc = useTranslations("common");
  const tf = useTranslations("features");
  const toMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const createSchool = useCreateSchool();

  const form = useForm<CreateSchoolInput>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) =>
    createSchool.mutate(values, {
      onSuccess: () => {
        notifySuccess(t("created_success"));
        form.reset(DEFAULT_VALUES);
        setOpen(false);
      },
      onError: (error) => applyFieldErrors(form.setError, error),
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) createSchool.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          {t("create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("create_title")}</DialogTitle>
          <DialogDescription>{t("create_description")}</DialogDescription>
        </DialogHeader>

        <form id="create-school-form" noValidate onSubmit={onSubmit}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>{t("school_section")}</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="name" label={t("name")} autoFocus />
                <TextField
                  control={form.control}
                  name="slug"
                  label={t("slug")}
                  description={t("slug_hint")}
                  dir="ltr"
                  autoComplete="off"
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("admin_section")}</FieldLegend>
              <TextField control={form.control} name="admin.fullName" label={t("admin_name")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  control={form.control}
                  name="admin.email"
                  label={t("admin_email")}
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                />
                <TextField
                  control={form.control}
                  name="admin.password"
                  label={t("admin_password")}
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("features_section")}</FieldLegend>
              <Controller
                control={form.control}
                name="features"
                render={({ field }) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FEATURE_KEYS.map((key) => (
                      <Field key={key} orientation="horizontal">
                        <Checkbox
                          id={`feature-${key}`}
                          checked={field.value.includes(key)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, key]
                                : field.value.filter((value) => value !== key),
                            )
                          }
                        />
                        <FieldLabel htmlFor={`feature-${key}`} className="font-normal">
                          {tf(key)}
                        </FieldLabel>
                      </Field>
                    ))}
                  </div>
                )}
              />
            </FieldSet>

            {/* Field-level errors are shown on their inputs; this is for everything else. */}
            {createSchool.isError && !hasFieldErrors(createSchool.error) && (
              <FieldError>{toMessage(createSchool.error)}</FieldError>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="create-school-form" disabled={createSchool.isPending}>
            {createSchool.isPending && <Loader2 aria-hidden className="animate-spin" />}
            {tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
