"use client";

import * as React from "react";
import type { LucideProps } from "lucide-react";
import { dynamicIconImports, type IconName } from "./dynamic-icon-imports";
import { normalizeIconName } from "./name-map";

const lazyIconCache = new Map<IconName, React.LazyExoticComponent<React.ComponentType<LucideProps>>>();

function getLazyIcon(name: IconName) {
  let Icon = lazyIconCache.get(name);
  if (!Icon) {
    Icon = React.lazy(dynamicIconImports[name]);
    lazyIconCache.set(name, Icon);
  }
  return Icon;
}

export interface DynamicIconProps extends Omit<LucideProps, "name"> {
  /** Stored icon name -- accepts both the canonical kebab-case form and
   * legacy PascalCase component names already in the database. */
  name: string | null | undefined;
  /** Icon name to use if `name` is empty or doesn't resolve to a known icon. */
  fallback?: IconName;
}

export function DynamicIcon({ name, fallback, size = 20, className, ...props }: DynamicIconProps) {
  const resolved = normalizeIconName(name) ?? fallback ?? null;
  if (!resolved) return null;

  const Icon = getLazyIcon(resolved);
  return (
    <React.Suspense fallback={<span className={className} style={{ display: "inline-block", width: size, height: size }} />}>
      <Icon size={size} className={className} {...props} />
    </React.Suspense>
  );
}
