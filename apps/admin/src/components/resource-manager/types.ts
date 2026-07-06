export type FieldConfig =
  | { key: string; label: string; type: "text" | "url"; required?: boolean }
  | { key: string; label: string; type: "textarea"; required?: boolean }
  | { key: string; label: string; type: "number"; required?: boolean }
  | { key: string; label: string; type: "checkbox" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean }
  // Same single-value selection as "select", but with a type-to-filter search
  // box — for fields with many possible options (e.g. every affiliate category).
  | { key: string; label: string; type: "combobox"; options: { value: string; label: string }[]; required?: boolean }
  | { key: string; label: string; type: "tags"; placeholder?: string }
  | { key: string; label: string; type: "multiselect"; options: { value: string; label: string }[] }
  // Same shape as multiselect, but adds a search box to filter the option
  // list — for fields with many possible options (e.g. every portfolio project).
  | { key: string; label: string; type: "multiselect-search"; options: { value: string; label: string }[]; placeholder?: string }
  // `key` stores the uploaded Media id (e.g. avatarId); `previewUrlKey` names
  // the sibling form-values key holding that asset's URL for preview,
  // defaulting to `${key}Url` — populate both via `toFormValues`.
  | { key: string; label: string; type: "image"; previewUrlKey?: string };

export interface ColumnConfig<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}
