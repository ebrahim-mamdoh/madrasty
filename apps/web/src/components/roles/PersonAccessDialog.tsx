"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { PermissionKey, PersonAccess, StaffRole } from "@madrasty/core";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import { FormDialog } from "@/components/shared/FormDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { useSetPersonAccess } from "@/hooks/queries/roles/useRoles";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "person-access-form";

export type PersonAccessDialogProps = {
  person: PersonAccess | null;
  roles: StaffRole[];
  onOpenChange: (open: boolean) => void;
};

/** Role groups plus individual extra permissions for one staff member or teacher. */
export function PersonAccessDialog({ person, roles, onOpenChange }: PersonAccessDialogProps) {
  const t = useTranslations("access.people");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSetPersonAccess();

  const [roleIds, setRoleIds] = useState<string[]>(person?.roleIds ?? []);
  const [extra, setExtra] = useState<PermissionKey[]>(person?.permissions ?? []);

  const inherited = [
    ...new Set(roles.filter((role) => roleIds.includes(role.id)).flatMap((r) => r.permissions)),
  ];

  const close = () => {
    onOpenChange(false);
    save.reset();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!person) return;
    // Anything a selected group already grants is not stored again as an individual grant.
    const permissions = extra.filter((key) => !inherited.includes(key));
    save.mutate(
      { id: person.id, input: { roleIds, permissions } },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
      },
    );
  };

  return (
    <FormDialog
      open={Boolean(person)}
      onOpenChange={(next) => !next && close()}
      title={t("edit_title", { name: person?.fullName ?? "" })}
      description={t("edit_description")}
      formId={FORM_ID}
      isPending={save.isPending}
      className="sm:max-w-3xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldTitle>{t("groups_label")}</FieldTitle>
            <FieldDescription>{t("groups_hint")}</FieldDescription>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("no_groups")}</p>
            ) : (
              <div role="group" aria-label={t("groups_label")} className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={roleIds.includes(role.id)}
                      onCheckedChange={(checked) =>
                        setRoleIds((current) =>
                          checked === true
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        )
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            )}
          </Field>

          <Field>
            <FieldTitle>{t("extra_label")}</FieldTitle>
            <FieldDescription>{t("extra_hint")}</FieldDescription>
            <PermissionMatrix
              label={t("extra_label")}
              value={extra}
              onChange={setExtra}
              inherited={inherited}
            />
          </Field>

          {save.isError && <FieldError>{toMessage(save.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
