"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import type { PersonOption } from "@madrasty/core";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export type StudentsChecklistProps = {
  label: string;
  description?: string;
  options: PersonOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
};

/** Searchable multi-select for linking students (e.g. a parent's children). */
export function StudentsChecklist({
  label,
  description,
  options,
  value,
  onChange,
  isLoading,
}: StudentsChecklistProps) {
  const t = useTranslations("people.parents");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const selected = new Set(value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Selected children stay on top so they are easy to review and untick.
    return [...options]
      .filter((o) => !q || o.fullName.toLowerCase().includes(q))
      .sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)));
  }, [options, query, value]);

  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));

  return (
    <Field>
      <FieldLabel htmlFor={searchId}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <div className="rounded-lg border">
        <div className="relative border-b">
          <Search
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search_students")}
            className="border-0 ps-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto p-1" aria-label={label}>
          {isLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="p-2">
                <Skeleton className="h-5 w-40" />
              </li>
            ))
          ) : visible.length === 0 ? (
            <li className="p-3 text-center text-sm text-muted-foreground">{t("no_students")}</li>
          ) : (
            visible.map((option) => {
              const checkboxId = `${searchId}-${option.id}`;
              return (
                <li key={option.id}>
                  <label
                    htmlFor={checkboxId}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selected.has(option.id)}
                      onCheckedChange={(checked) => toggle(option.id, checked === true)}
                    />
                    <span className="flex-1 text-sm">{option.fullName}</span>
                    {option.detail && (
                      <span className="text-xs text-muted-foreground">{option.detail}</span>
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          {t("selected_count", { count: value.length })}
        </p>
      </div>
    </Field>
  );
}
