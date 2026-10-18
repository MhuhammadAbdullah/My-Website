import Link from "next/link";
import { Button } from "@agency/ui";
import type { ButtonValue } from "@agency/types";

/** Renders a CMS "button" field. Renders nothing unless it has both a label and a link. */
export function CmsButton({
  button,
  size = "md",
  className,
  onAccent = false,
}: {
  button: Partial<ButtonValue> | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** On the accent-coloured band a primary button flips to the dark surface for contrast. */
  onAccent?: boolean;
}) {
  const label = button?.label?.trim();
  const href = button?.href?.trim();
  if (!label || !href) return null;
  const secondary = button?.style === "secondary";
  const external = button?.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const onAccentClasses = onAccent
    ? secondary
      ? "!border-[#0b0b0c] !text-[#0b0b0c] hover:!bg-[#0b0b0c]/10"
      : "!bg-[#0b0b0c] !text-[color:var(--accent)] hover:!bg-[#1c1c1f]"
    : "";
  return (
    <Button
      asChild
      size={size}
      variant={secondary ? "secondary" : "primary"}
      withArrow={!secondary}
      className={[onAccentClasses, className ?? ""].filter(Boolean).join(" ")}
    >
      <Link href={href} {...external}>
        {label}
      </Link>
    </Button>
  );
}
