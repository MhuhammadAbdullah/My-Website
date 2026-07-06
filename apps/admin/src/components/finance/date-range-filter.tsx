"use client";

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agency/ui";

export type RangePreset = "today" | "week" | "month" | "year" | "custom";

export interface DateRangeValue {
  preset: RangePreset;
  from: string;
  to: string;
}

const PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export function DateRangeFilter({ value, onChange }: { value: DateRangeValue; onChange: (next: DateRangeValue) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => onChange({ ...value, preset: v as RangePreset })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "custom" && (
        <>
          <Input type="date" className="w-40" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <span className="text-body-sm text-neutral-400">to</span>
          <Input type="date" className="w-40" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </>
      )}
    </div>
  );
}
