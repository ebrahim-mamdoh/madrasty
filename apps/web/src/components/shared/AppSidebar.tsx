"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Portal } from "@madrasty/core";
import { BrandMark } from "@/components/shared/BrandMark";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAVIGATION, type NavItem } from "@/constants/navigation";
import { useSession } from "@/hooks/useSession";
import { Link, usePathname } from "@/i18n/navigation";
import { localeDirection } from "@/i18n/routing";

export type AppSidebarProps = {
  portal: Portal;
};

function isActive(pathname: string, item: NavItem, portalHome: string): boolean {
  if (item.href === portalHome) return pathname === portalHome;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({ portal }: AppSidebarProps) {
  const t = useTranslations();
  const { school, permissions, features } = useSession();
  const pathname = usePathname();
  const isRtl = localeDirection(useLocale()) === "rtl";

  const items = NAVIGATION[portal].filter(
    (item) =>
      (!item.permission || permissions.includes(item.permission)) &&
      (!item.feature || features.includes(item.feature)),
  );
  const portalHome = NAVIGATION[portal][0]?.href ?? "/";

  return (
    <Sidebar side={isRtl ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <BrandMark
          name={school?.branding.name ?? t("common.app_name")}
          logoUrl={school?.branding.logoUrl}
          subtitle={t(`portals.${portal}`)}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const label = t(`nav.${item.key}`);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, item, portalHome)}
                      tooltip={{ children: label, side: isRtl ? "left" : "right" }}
                    >
                      <Link href={item.href}>
                        <item.icon aria-hidden />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
