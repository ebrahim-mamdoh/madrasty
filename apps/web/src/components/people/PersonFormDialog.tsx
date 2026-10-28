"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  generateTemporaryPassword,
  personAccountSchema,
  updatePersonSchema,
  type CreatePersonInput,
  type ManagedPersonRole,
  type PersonListItem,
  type SchoolClass,
} from "@madrasty/core";
import { StudentsChecklist } from "@/components/people/StudentsChecklist";
import { TemporaryPasswordField } from "@/components/people/TemporaryPasswordField";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useCreatePerson,
  useStudentOptions,
  useUpdatePerson,
} from "@/hooks/queries/people/usePeople";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "person-form";

const placementFields = {
  classId: z.union([z.uuid(), z.literal("")]),
  studentIds: z.array(z.uuid()),
};
const createFormSchema = personAccountSchema.extend(placementFields);
// Email and password are fixed after creation; they stay in the form shape but are not validated.
const editFormSchema = updatePersonSchema.extend({
  ...placementFields,
  email: z.string(),
  password: z.string(),
});

type PersonFormValues = z.input<typeof createFormSchema>;

export const ROLE_NAMESPACE = {
  teacher: "teachers",
  student: "students",
  parent: "parents",
} as const satisfies Record<ManagedPersonRole, string>;

export type PersonFormDialogProps = {
  role: ManagedPersonRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new account. */
  person: PersonListItem | null;
  /** Students are placed in classes of the current academic year. */
  currentYearId: string | undefined;
  classes: SchoolClass[];
};

function toCreateInput(role: ManagedPersonRole, values: PersonFormValues): CreatePersonInput {
  const account = {
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    password: values.password,
  };
  if (role === "student") return { role, ...account, classId: values.classId };
  if (role === "parent") return { role, ...account, studentIds: values.studentIds };
  return { role, ...account };
}

export function PersonFormDialog({
  role,
  open,
  onOpenChange,
  person,
  currentYearId,
  classes,
}: PersonFormDialogProps) {
  const t = useTranslations("people");
  const tr = useTranslations(`people.${ROLE_NAMESPACE[role]}`);
  const tStudents = useTranslations("people.students");
  const tParents = useTranslations("people.parents");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();

  const create = useCreatePerson();
  const update = useUpdatePerson();
  const mutation = person ? update : create;
  const students = useStudentOptions(currentYearId, open && role === "parent");

  const defaults: PersonFormValues = {
    fullName: person?.fullName ?? "",
    phone: person?.phone ?? "",
    email: person?.email ?? "",
    password: person ? "" : generateTemporaryPassword(),
    classId: person?.currentClass?.id ?? "",
    studentIds: person?.links?.map((link) => link.id) ?? [],
  };
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(person ? editFormSchema : createFormSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset({ ...defaults, password: person ? "" : generateTemporaryPassword() });
    create.reset();
    update.reset();
  };

  const onError = (error: unknown) => applyFieldErrors(form.setError, error);

  const onSubmit = form.handleSubmit((values) => {
    if (!person) {
      create.mutate(toCreateInput(role, values), {
        onSuccess: () => {
          notifySuccess(t("created"));
          close();
        },
        onError,
      });
      return;
    }
    update.mutate(
      {
        id: person.id,
        input: { fullName: values.fullName, phone: values.phone },
        placement:
          role === "student" && currentYearId
            ? { academicYearId: currentYearId, classId: values.classId }
            : undefined,
        childIds: role === "parent" ? values.studentIds : undefined,
      },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
        onError,
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={person ? tr("edit_title") : tr("create_title")}
      formId={FORM_ID}
      isPending={mutation.isPending}
      submitLabel={person ? undefined : tc("create")}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField
            control={form.control}
            name="fullName"
            label={t("fields.full_name")}
            autoFocus
          />

          {person ? (
            <Field>
              <FieldLabel htmlFor="person-email">{t("fields.email")}</FieldLabel>
              <Input id="person-email" value={person.email ?? ""} dir="ltr" disabled readOnly />
            </Field>
          ) : (
            <TextField
              control={form.control}
              name="email"
              label={t("fields.email")}
              description={t("fields.email_hint")}
              type="email"
              dir="ltr"
              autoComplete="off"
            />
          )}

          <TextField
            control={form.control}
            name="phone"
            label={t("fields.phone")}
            description={t("fields.phone_hint")}
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="off"
          />

          {!person && (
            <TemporaryPasswordField
              control={form.control}
              name="password"
              label={t("fields.password")}
              description={t("fields.password_hint")}
            />
          )}

          {role === "student" &&
            (currentYearId ? (
              <SelectField
                control={form.control}
                name="classId"
                label={tStudents("class")}
                emptyOptionLabel={tStudents("no_class")}
                options={classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} — ${c.gradeLevel.name}`,
                }))}
              />
            ) : (
              <FieldDescription>{tStudents("no_current_year")}</FieldDescription>
            ))}

          {role === "parent" && (
            <Controller
              control={form.control}
              name="studentIds"
              render={({ field }) => (
                <StudentsChecklist
                  label={tParents("children")}
                  description={tParents("children_hint")}
                  options={students.data ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  isLoading={students.isLoading}
                />
              )}
            />
          )}

          {mutation.isError && !hasFieldErrors(mutation.error) && (
            <FieldError>{toMessage(mutation.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
