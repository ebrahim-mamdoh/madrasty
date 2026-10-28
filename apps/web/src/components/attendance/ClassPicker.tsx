"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ClassPickerProps = {
  classes: { id: string; name: string; detail?: string }[];
  value: string | undefined;
  onChange: (classId: string) => void;
  label: string;
};

export function ClassPicker({ classes, value, onChange, label }: ClassPickerProps) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger className="w-60" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.detail ? `${c.name} — ${c.detail}` : c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
