"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  PERMISSIONS_BY_MODULE,
  permissionAction,
  type PermissionKey,
} from "@madrasty/core";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type PermissionMatrixProps = {
  value: PermissionKey[];
  onChange: (permissions: PermissionKey[]) => void;
  /** Already granted from elsewhere (e.g. the person's role groups): shown ticked and locked. */
  inherited?: PermissionKey[];
  disabled?: boolean;
  /** Accessible name for the whole matrix. */
  label: string;
};

/** One row per module, one checkbox per action; the row checkbox toggles the whole module. */
export function PermissionMatrix({
  value,
  onChange,
  inherited = [],
  disabled,
  label,
}: PermissionMatrixProps) {
  const t = useTranslations("permissions");
  const baseId = useId();
  const selected = new Set(value);
  const locked = new Set(inherited);

  const setMany = (keys: PermissionKey[], checked: boolean) => {
    const next = new Set(value);
    for (const key of keys) {
      if (checked) next.add(key);
      else next.delete(key);
    }
    // Keep catalog order so saved arrays are stable and diffs stay minimal.
    onChange(PERMISSIONS_BY_MODULE.flatMap((group) => group.keys).filter((key) => next.has(key)));
  };

  return (
    <div role="group" aria-label={label} className="divide-y rounded-lg border">
      {PERMISSIONS_BY_MODULE.map(({ module, keys }) => {
        const editable = keys.filter((key) => !locked.has(key));
        const granted = keys.filter((key) => selected.has(key) || locked.has(key)).length;
        const rowState =
          granted === keys.length ? true : granted === 0 ? false : ("indeterminate" as const);
        const rowId = `${baseId}-${module}`;
        const moduleLabel = t(`modules.${module}`);

        return (
          <div key={module} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2.5">
            <label htmlFor={rowId} className="flex w-44 shrink-0 items-center gap-2.5 font-medium">
              <Checkbox
                id={rowId}
                aria-label={moduleLabel}
                checked={rowState}
                disabled={disabled || editable.length === 0}
                onCheckedChange={(checked) => setMany(editable, checked === true)}
              />
              <span className="text-sm">{moduleLabel}</span>
            </label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {keys.map((key) => {
                const isLocked = locked.has(key);
                const id = `${baseId}-${key}`;
                return (
                  <label
                    key={key}
                    htmlFor={id}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isLocked ? "text-muted-foreground" : "cursor-pointer",
                    )}
                    title={isLocked ? t("inherited") : undefined}
                  >
                    <Checkbox
                      id={id}
                      aria-label={`${moduleLabel} — ${t(`actions.${permissionAction(key)}`)}`}
                      checked={isLocked || selected.has(key)}
                      disabled={disabled || isLocked}
                      onCheckedChange={(checked) => setMany([key], checked === true)}
                    />
                    {t(`actions.${permissionAction(key)}`)}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
