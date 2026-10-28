"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FEATURE_KEYS, type FeatureKey } from "@madrasty/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useSetSchoolFeatures } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

export type SchoolFeaturesCardProps = {
  schoolId: string;
  features: FeatureKey[];
};

/** The school's plan: which modules its portals (and the DB) let it use. */
export function SchoolFeaturesCard({ schoolId, features }: SchoolFeaturesCardProps) {
  const t = useTranslations("platform.school");
  const tf = useTranslations("features");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSetSchoolFeatures();
  const [selected, setSelected] = useState<FeatureKey[]>(features);

  const isDirty =
    selected.length !== features.length || selected.some((key) => !features.includes(key));

  const onSave = () =>
    save.mutate(
      { id: schoolId, features: FEATURE_KEYS.filter((key) => selected.includes(key)) },
      {
        onSuccess: () => notifySuccess(t("features_saved")),
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("features_title")}</CardTitle>
        <CardDescription>{t("features_hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURE_KEYS.map((key) => (
            <Field key={key} orientation="horizontal">
              <Checkbox
                id={`school-feature-${key}`}
                checked={selected.includes(key)}
                onCheckedChange={(checked) =>
                  setSelected((current) =>
                    checked === true ? [...current, key] : current.filter((k) => k !== key),
                  )
                }
              />
              <FieldLabel htmlFor={`school-feature-${key}`} className="font-normal">
                {tf(key)}
              </FieldLabel>
            </Field>
          ))}
        </div>
        <Button onClick={onSave} disabled={save.isPending || !isDirty}>
          {save.isPending && <Loader2 aria-hidden className="animate-spin" />}
          {tc("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
