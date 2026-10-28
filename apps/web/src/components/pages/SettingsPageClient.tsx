"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import {
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  schoolSettingsSchema,
  type SchoolSettingsInput,
} from "@madrasty/core";
import { PageHeader } from "@/components/shared/PageHeader";
import { ColorField } from "@/components/shared/form/ColorField";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { SCHOOL_TIMEZONES } from "@/constants/timezones";
import { useUpdateSchoolSettings, type SchoolLogoChange } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useSession } from "@/hooks/useSession";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "school-settings-form";

const LOGO_EXTENSIONS: Record<(typeof LOGO_MIME_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isLogoType(type: string): type is (typeof LOGO_MIME_TYPES)[number] {
  return (LOGO_MIME_TYPES as readonly string[]).includes(type);
}

/** Admin → Settings: the school's name, time zone and white-label identity. */
export function SettingsPageClient() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { school } = useSession();
  const save = useUpdateSchoolSettings();
  const fileInputId = useId();

  const form = useForm<SchoolSettingsInput>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      name: school?.name ?? "",
      timezone: school?.timezone ?? "Africa/Cairo",
      primaryColor: school?.branding.primaryColor ?? "",
      secondaryColor: school?.branding.secondaryColor ?? "",
    },
  });

  const [logo, setLogo] = useState<SchoolLogoChange>(undefined);
  const [logoError, setLogoError] = useState<string | null>(null);
  const preview = useMemo(
    () => (logo && logo !== "remove" ? URL.createObjectURL(logo.file) : null),
    [logo],
  );
  // Object URLs must be released when the picked file changes or the page unmounts.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const currentLogo =
    logo === "remove" ? null : (preview ?? school?.branding.logoUrl ?? null);

  const onPickLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isLogoType(file.type)) return setLogoError(t("logo_type"));
    if (file.size > LOGO_MAX_BYTES) return setLogoError(t("logo_too_large"));
    setLogoError(null);
    setLogo({ file, extension: LOGO_EXTENSIONS[file.type] });
  };

  // A zone saved before this list existed stays selectable.
  const savedTimezone = school?.timezone;
  const timezoneOptions = [
    ...new Set<string>([...SCHOOL_TIMEZONES, ...(savedTimezone ? [savedTimezone] : [])]),
  ].map((zone) => ({ value: zone, label: zone }));

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { input, logo },
      {
        onSuccess: () => {
          notifySuccess(t("saved"));
          setLogo(undefined);
          form.reset(input);
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {save.isPending && <Loader2 aria-hidden className="animate-spin" />}
            {tc("save")}
          </Button>
        }
      />

      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("identity")}</CardTitle>
            <CardDescription>{t("identity_hint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField control={form.control} name="name" label={t("name")} />
              <SelectField
                control={form.control}
                name="timezone"
                label={t("timezone")}
                options={timezoneOptions}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("branding")}</CardTitle>
            <CardDescription>{t("branding_hint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                  {currentLogo ? (
                    <Image
                      src={currentLogo}
                      alt={t("logo")}
                      width={80}
                      height={80}
                      unoptimized={Boolean(preview)}
                      className="size-full object-contain"
                    />
                  ) : (
                    <ImageUp aria-hidden className="size-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor={fileInputId} className="cursor-pointer">
                        <ImageUp aria-hidden />
                        {currentLogo ? t("change_logo") : t("upload_logo")}
                      </label>
                    </Button>
                    {currentLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setLogoError(null);
                          // First discards a freshly picked file, then removes the saved logo.
                          setLogo(logo && logo !== "remove" ? undefined : "remove");
                        }}
                      >
                        <Trash2 aria-hidden />
                        {t("remove_logo")}
                      </Button>
                    )}
                  </div>
                  <input
                    id={fileInputId}
                    type="file"
                    accept={LOGO_MIME_TYPES.join(",")}
                    className="sr-only"
                    onChange={onPickLogo}
                  />
                  <FieldDescription>{t("logo_hint")}</FieldDescription>
                  {logoError && <FieldError>{logoError}</FieldError>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField control={form.control} name="primaryColor" label={t("primary_color")} />
                <ColorField
                  control={form.control}
                  name="secondaryColor"
                  label={t("secondary_color")}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {save.isError && !hasFieldErrors(save.error) && (
          <FieldError className="lg:col-span-2">{toMessage(save.error)}</FieldError>
        )}
      </form>
    </>
  );
}
