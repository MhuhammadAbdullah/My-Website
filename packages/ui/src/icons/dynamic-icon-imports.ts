import dynamicIconImports from "lucide-react/dynamicIconImports";

export { dynamicIconImports };
export type IconName = keyof typeof dynamicIconImports;

const ICON_NAME_SET = new Set(Object.keys(dynamicIconImports));

export function isIconName(value: string): value is IconName {
  return ICON_NAME_SET.has(value);
}

export const ALL_ICON_NAMES = Object.keys(dynamicIconImports) as IconName[];
