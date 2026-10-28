"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type IconActionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Icon-only row action with an accessible label and tooltip. */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
  className,
}: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "size-8 text-muted-foreground",
            destructive
              ? "hover:bg-destructive/10 hover:text-destructive"
              : "hover:text-foreground",
            className,
          )}
        >
          <Icon aria-hidden className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
