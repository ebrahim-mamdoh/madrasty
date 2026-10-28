"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { updateSchoolSchema, type School, type UpdateSchoolInput } from "@madrasty/core";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUpdateSchool } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

export function SchoolInfoCard({ school }: { school: School }) {
  const t = useTranslations("platform.school");
  const ts = useTranslations("platform.schools");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const update = useUpdateSchool();

  const form = useForm<UpdateSchoolInput>({
    resolver: zodResolver(updateSchoolSchema),
    defaultValues: { name: school.name },
  });

  const onSubmit = form.handleSubmit((input) =>
    update.mutate(
      { id: school.id, input },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          form.reset(input);
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("info_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit}>
          <FieldGroup>
            <TextField control={form.control} name="name" label={ts("name")} />
            <Field>
              <FieldLabel htmlFor="school-slug">{ts("slug")}</FieldLabel>
              <Input id="school-slug" value={school.slug} dir="ltr" disabled readOnly />
            </Field>
            {update.isError && !hasFieldErrors(update.error) && (
              <FieldError>{toMessage(update.error)}</FieldError>
            )}
            <div>
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending && <Loader2 aria-hidden className="animate-spin" />}
                {tc("save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
