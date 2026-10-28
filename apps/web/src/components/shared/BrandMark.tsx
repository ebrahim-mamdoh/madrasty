import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandMarkProps = {
  name: string;
  /** School logo; falls back to the Madrasty mark. */
  logoUrl?: string | null;
  subtitle?: string;
  size?: "sm" | "lg";
  className?: string;
};

export function BrandMark({ name, logoUrl, subtitle, size = "sm", className }: BrandMarkProps) {
  const px = size === "lg" ? 56 : 36;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Image
        src={logoUrl ?? "/brand/madrasty-logo.jpg"}
        alt={name}
        width={px}
        height={px}
        className="shrink-0 rounded-lg object-contain"
        priority
      />
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        <p className={cn("truncate font-bold", size === "lg" ? "text-xl" : "text-sm")}>{name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
