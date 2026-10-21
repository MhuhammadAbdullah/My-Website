import { Wallet } from "lucide-react";
import type { PayoutMethodTypeId } from "@agency/types";

// Real brand logos, purely a display aid: keeps the method pickers and lists scannable at a glance instead of a wall of
// text. OTHER_WALLET has no single brand to show, so it keeps a generic wallet icon.
export const PAYOUT_METHOD_LOGOS: Partial<Record<PayoutMethodTypeId, string>> = {
  BANK_ACCOUNT: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786106349/images-removebg-preview_w6d2kj.png",
  EASYPAISA: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786106155/unnamed-removebg-preview_xoxto3.png",
  JAZZCASH: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786106217/unnamed-removebg-preview_1_yepkei.png",
  SADAPAY: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786106022/unnamed_salzri.png",
  NAYAPAY: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786106096/Nayapay-icon-New-Logo-PNG-SVG-Logo-01-removebg-preview_xnl5au.png",
  RAAST: "https://res.cloudinary.com/dgkd8jw6a/image/upload/v1786105477/Raast_Logo_cxvgpi.svg",
};

// Fixed brand-logo URLs (not user content), some of them SVG, which next/image's optimizer refuses by default,
// so a plain <img> is the simpler fit.
export function PayoutMethodIcon({ type, size = 8 }: { type: string; size?: 6 | 8 | 9 }) {
  const logo = PAYOUT_METHOD_LOGOS[type as PayoutMethodTypeId];
  const dimension = size === 9 ? "h-9 w-9" : size === 6 ? "h-6 w-6" : "h-8 w-8";
  if (logo) {
    return (
      <span className={`flex ${dimension} shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white p-1`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span className={`flex ${dimension} shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-black`}>
      <Wallet className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
