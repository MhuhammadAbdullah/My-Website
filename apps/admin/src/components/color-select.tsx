"use client";

import * as React from "react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@agency/ui";
import { BADGE_COLOR_DOT_CLASSES, BADGE_COLOR_OPTIONS, HEX_COLOR_REGEX, isPresetColor, type BadgeColorId } from "@/lib/badge-colors";

const CUSTOM_VALUE = "__custom";
const DEFAULT_VALUE = "__default";

function initialMode(value: string | null): string {
  if (value === null) return DEFAULT_VALUE;
  return isPresetColor(value) ? value : CUSTOM_VALUE;
}

// Shared by the Discounts and Badges admin pages -- both let admin pick a
// display color for something the public site renders as a solid badge
// (InfluencerBadge.color, Discount.color): either one of the fixed presets,
// or their own hex code via the "Custom color" option below, rendered with
// an inline style on the public site since Tailwind can't generate a class
// for a color it doesn't know about at build time.
export function ColorSelect({
  value,
  onValueChange,
  placeholder = "Default",
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
}) {
  // `mode` is tracked as its own state rather than re-derived from `value`
  // on every render -- picking "Custom color code" before typing a valid
  // hex emits onValueChange(null) below, and re-deriving the Select's
  // displayed value from that null on the next render would immediately
  // snap it back to "Default", making the custom option look broken (it
  // could never stay selected long enough to reveal the hex input).
  const [mode, setMode] = React.useState(() => initialMode(value));
  const [customHex, setCustomHex] = React.useState(value && !isPresetColor(value) ? value : "");

  function handleSelectChange(v: string) {
    setMode(v);
    if (v === DEFAULT_VALUE) {
      onValueChange(null);
    } else if (v === CUSTOM_VALUE) {
      onValueChange(HEX_COLOR_REGEX.test(customHex) ? customHex : null);
    } else {
      onValueChange(v);
    }
  }

  function handleHexChange(hex: string) {
    setCustomHex(hex);
    onValueChange(HEX_COLOR_REGEX.test(hex) ? hex : null);
  }

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_VALUE}>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full border border-dashed border-neutral-300" />
              Default
            </span>
          </SelectItem>
          {BADGE_COLOR_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              <span className="flex items-center gap-2">
                <span className={cn("size-3 rounded-full", BADGE_COLOR_DOT_CLASSES[c.value])} />
                {c.label}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-full border border-neutral-300"
                style={HEX_COLOR_REGEX.test(customHex) ? { backgroundColor: customHex } : undefined}
              />
              Custom color code
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {mode === CUSTOM_VALUE && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={HEX_COLOR_REGEX.test(customHex) ? customHex : "#000000"}
            onChange={(e) => handleHexChange(e.target.value)}
            className="size-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
            aria-label="Pick a custom color"
          />
          <Input
            value={customHex}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#FF6B00"
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}

export function ColorDot({ color, className }: { color: string | null; className?: string }) {
  const preset = color && isPresetColor(color) ? (color as BadgeColorId) : null;
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", preset ? BADGE_COLOR_DOT_CLASSES[preset] : !color ? "bg-neutral-300" : undefined, className)}
      style={!preset && color ? { backgroundColor: color } : undefined}
    />
  );
}
