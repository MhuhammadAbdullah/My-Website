import { cn } from "@agency/ui";
import { currencySymbol, formatAmount } from "@/lib/currency";

// The default currency (₨/PKR) isn't covered by Manrope's `latin` subset, so
// the browser falls back to a system font mid-string for just that glyph.
// Giving the symbol its own span with an explicit fallback stack (and a
// weight/size tuned to that stack) avoids the synthesized-bold blur that
// happens when a bold/semibold price inherits onto a font with no bold face.
export function Price({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="currency-symbol">{currencySymbol(currency)}</span>
      <span>{formatAmount(amount)}</span>
    </span>
  );
}
