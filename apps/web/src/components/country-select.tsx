"use client";

import * as React from "react";
import { Combobox } from "@agency/ui";
import { COUNTRIES } from "@agency/utils";

const OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

// Searchable country picker (type to filter, arrow keys + Enter, Esc to close).
// `anyLabel` adds a first "all countries" row whose value is "" (used by filters).
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select your country",
  anyLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  anyLabel?: string;
  className?: string;
}) {
  const options = React.useMemo(() => (anyLabel ? [{ value: "__any", label: anyLabel }, ...OPTIONS] : OPTIONS), [anyLabel]);
  return (
    <Combobox
      options={options}
      value={value || (anyLabel ? "__any" : "")}
      onValueChange={(v) => onChange(v === "__any" ? "" : v)}
      placeholder={placeholder}
      searchPlaceholder="Search country…"
      emptyText="No country found."
      className={className}
    />
  );
}
