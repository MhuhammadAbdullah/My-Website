import type { ButtonValue, ImageValue } from "@agency/types";

export type { ButtonValue, ImageValue };

/** Every section receives its CMS content untyped at the boundary; each component narrows what it reads. */
export type Content = Record<string, unknown>;

export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
export const arr = <T = Content>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const img = (v: unknown): ImageValue | null =>
  v && typeof v === "object" && typeof (v as ImageValue).url === "string" && (v as ImageValue).url ? (v as ImageValue) : null;
