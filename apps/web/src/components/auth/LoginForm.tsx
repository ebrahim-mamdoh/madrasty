"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@madrasty/core";
import { TextField } from "@/components/shared/form/TextField";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSignIn } from "@/hooks/queries/session/useSessionMutations";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export function LoginForm() {
  const t = useTranslations("auth");
  const toMessage = useErrorMessage();
  const signIn = useSignIn();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label={t("email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          autoFocus
        />
        <TextField
          control={form.control}
          name="password"
          label={t("password")}
          type="password"
          autoComplete="current-password"
          dir="ltr"
        />

        {signIn.isError && <FieldError>{toMessage(signIn.error)}</FieldError>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={signIn.isPending || signIn.isSuccess}
        >
          {(signIn.isPending || signIn.isSuccess) && (
            <Loader2 aria-hidden className="animate-spin" />
          )}
          {t("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
