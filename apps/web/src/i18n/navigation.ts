import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/** Locale-aware navigation. Never import Link/redirect/useRouter from next directly. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
