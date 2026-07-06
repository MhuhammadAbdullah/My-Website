import * as React from "react";
import { cn } from "./lib/cn";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const sizeByLevel: Record<HeadingLevel, string> = {
  1: "text-h1",
  2: "text-h2",
  3: "text-h3",
  4: "text-h4",
  5: "text-body-lg",
  6: "text-body",
};

/**
 * Splits `children` (a plain string) on `**emphasis**` markers and renders the
 * emphasized words in Playfair Display while the rest stays in Manrope, per
 * the brief's "important words serif, rest sans" heading rule.
 */
function renderWithEmphasis(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} data-serif-emphasis className="not-italic sm:italic">
        {part}
      </em>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function Heading({
  level = 2,
  as,
  className,
  children,
  display = false,
}: {
  level?: HeadingLevel;
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
  display?: boolean;
}) {
  const Tag = as ?? (`h${level}` as React.ElementType);
  const content = typeof children === "string" ? renderWithEmphasis(children) : children;

  return (
    <Tag
      className={cn(
        display ? "text-display" : sizeByLevel[level],
        "text-balance",
        className,
      )}
    >
      {content}
    </Tag>
  );
}
