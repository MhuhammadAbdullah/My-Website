import { ALL_ICON_NAMES, isIconName, type IconName } from "./dynamic-icon-imports";

// Lucide's canonical icon names are kebab-case (e.g. "badge-dollar-sign").
// Older content in this CMS stored the PascalCase component name instead
// (e.g. "BadgeDollarSign") -- this table lets old data keep rendering
// without a database migration. Built by deriving kebab -> Pascal (a safe,
// lossless transform: split on "-", capitalize each segment, join) and
// inverting it, rather than regexing the legacy Pascal strings directly,
// since Pascal -> kebab is ambiguous for names with consecutive capitals
// (e.g. "AArrowDown").
function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

const PASCAL_TO_KEBAB = new Map<string, IconName>(ALL_ICON_NAMES.map((name) => [kebabToPascal(name), name]));

// Extensible escape hatch for the rare case an icon is genuinely renamed or
// removed in a future lucide-react upgrade -- maps the old name (either
// format) to a deliberately chosen replacement, so old content keeps
// showing *an* icon instead of silently going blank.
const RENAMED_ICONS: Record<string, IconName> = {};

export function normalizeIconName(stored: string | null | undefined): IconName | null {
  if (!stored) return null;
  if (isIconName(stored)) return stored;
  const renamed = RENAMED_ICONS[stored];
  if (renamed) return renamed;
  return PASCAL_TO_KEBAB.get(stored) ?? null;
}
