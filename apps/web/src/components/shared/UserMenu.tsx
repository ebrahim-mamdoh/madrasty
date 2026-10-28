"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/hooks/queries/session/useSessionMutations";
import { useSession } from "@/hooks/useSession";

/** One letter: two Arabic initials side by side read as a word (e.g. "مدير الاختبار" → "ما"). */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export function UserMenu() {
  const t = useTranslations();
  const { profile } = useSession();
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initial(profile.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-start sm:block">
            <span className="block text-sm leading-tight font-medium">{profile.fullName}</span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {t(`roles.${profile.role}`)}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {profile.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signOut.isPending}
          onSelect={() => signOut.mutate()}
        >
          <LogOut aria-hidden />
          {t("common.sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
