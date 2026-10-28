"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BILLING_CYCLES, subscriptionSchema, type SubscriptionInput } from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans, useSubscribeSchool, useSubscriptions } from "@/hooks/queries/finance/useFinance";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { localDate } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { cn, notifySuccess } from "@/lib/utils";

/** Platform → school detail: current subscription and history, and subscribing / renewing. */
export function SubscriptionCard({ schoolId }: { schoolId: string }) {
  const t = useTranslations("platform.subscription");
  const format = useFormatter();
  const subscriptions = useSubscriptions(schoolId);
  const [open, setOpen] = useState(false);
  // Captured once per mount: "days left" doesn't need to tick while the page is open.
  const [now] = useState(() => Date.now());
  const current = subscriptions.data?.[0];
  const daysLeft = current
    ? Math.ceil((localDate(current.endsOn).getTime() - now) / 86_400_000)
    : null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setOpen(true)}>
            <RefreshCw aria-hidden />
            {current ? t("renew") : t("subscribe")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {subscriptions.isLoading ? (
          <Skeleton className="h-16" />
        ) : !current ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t("plan")}: </span>
                <span className="font-medium">{current.planName}</span> · {t(`cycles.${current.cycle}`)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("ends_on")}: </span>
                <span className="font-medium">{format.dateTime(localDate(current.endsOn), { dateStyle: "medium" })}</span>
              </p>
              <p className={cn("font-medium", daysLeft !== null && daysLeft <= 30 ? "text-destructive" : "text-success")}>
                {daysLeft !== null && daysLeft >= 0 ? t("days_left", { n: daysLeft }) : t("expired")}
              </p>
            </div>
            {subscriptions.data!.length > 1 && (
              <ul className="divide-y rounded-lg border text-sm">
                {subscriptions.data!.slice(1).map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 px-3 py-2 text-muted-foreground">
                    <span>
                      {s.planName} · {t(`cycles.${s.cycle}`)}
                    </span>
                    <span>
                      {format.dateTime(localDate(s.startsOn), { dateStyle: "medium" })} –{" "}
                      {format.dateTime(localDate(s.endsOn), { dateStyle: "medium" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
      <SubscribeDialog
        key={open ? "open" : "closed"}
        schoolId={schoolId}
        open={open}
        onOpenChange={setOpen}
        startsOn={current && daysLeft !== null && daysLeft > 0 ? current.endsOn : new Date(now).toISOString().slice(0, 10)}
      />
    </Card>
  );
}

function SubscribeDialog({
  schoolId,
  open,
  onOpenChange,
  startsOn,
}: {
  schoolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startsOn: string;
}) {
  const t = useTranslations("platform.subscription");
  const toMessage = useErrorMessage();
  const plans = usePlans();
  const subscribe = useSubscribeSchool();
  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: { planId: "", cycle: "yearly", startsOn },
  });

  const onSubmit = form.handleSubmit((input) =>
    subscribe.mutate(
      { schoolId, input },
      {
        onSuccess: () => {
          notifySuccess(t("done"));
          onOpenChange(false);
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialog_title")}
      formId="subscribe-form"
      isPending={subscribe.isPending}
    >
      <form id="subscribe-form" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <SelectField
            control={form.control}
            name="planId"
            label={t("plan")}
            placeholder={t("choose_plan")}
            options={(plans.data ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="cycle"
              label={t("cycle")}
              options={BILLING_CYCLES.map((c) => ({ value: c, label: t(`cycles.${c}`) }))}
            />
            <TextField control={form.control} name="startsOn" label={t("starts_on")} type="date" dir="ltr" />
          </div>
          <FieldDescription>{t("dialog_hint")}</FieldDescription>
          {subscribe.isError && !hasFieldErrors(subscribe.error) && <FieldError>{toMessage(subscribe.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
