"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@agency/ui";
import { POPUP_TEMPLATE_FIELD_CONFIG, type PopupCloseButtonStyle, type PopupTextAlignment } from "@agency/types";
import type { PopupFormState } from "@/app/(dashboard)/popups/page";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = Number.parseInt(full.slice(0, 2), 16) || 0;
  const g = Number.parseInt(full.slice(2, 4), 16) || 0;
  const b = Number.parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Same offset trick as page.tsx's zonedDateTimeToUtc -- duplicated locally
// (rather than imported) since it's a few lines and the preview shouldn't
// depend on the dialog's internal helpers beyond the PopupFormState shape.
function zonedDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string): number {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const asIfLocal = new Date(naiveUtc.toLocaleString("en-US", { timeZone }));
  const asIfUtc = new Date(naiveUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = asIfUtc.getTime() - asIfLocal.getTime();
  return naiveUtc.getTime() + offset;
}

const TEXT_ALIGN_CLASS: Record<PopupTextAlignment, string> = { LEFT: "text-left", CENTER: "text-center", RIGHT: "text-right" };
const ITEMS_ALIGN_CLASS: Record<PopupTextAlignment, string> = { LEFT: "items-start", CENTER: "items-center", RIGHT: "items-end" };

function PreviewCountdown({ dateStr, timeStr, timeZone }: { dateStr: string; timeStr: string; timeZone: string }) {
  const target = dateStr && timeStr ? zonedDateTimeToUtc(dateStr, timeStr, timeZone) : null;
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!target) {
    return <p className="text-body-sm text-neutral-400">Set an end date/time to preview the countdown.</p>;
  }

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units: [number, string][] = [
    [days, "Days"],
    [hours, "Hours"],
    [minutes, "Minutes"],
    [seconds, "Seconds"],
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {units.map(([value, label], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-h4 font-semibold opacity-40">:</span>}
          <div className="flex flex-col items-center">
            <span className="font-mono text-h4 font-semibold tabular-nums">{String(value).padStart(2, "0")}</span>
            <span className="text-label uppercase opacity-60">{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function CloseButtonPreview({ variant }: { variant: PopupCloseButtonStyle }) {
  const styleClass =
    variant === "MINIMAL"
      ? "size-7 text-neutral-500"
      : variant === "CIRCLE"
        ? "size-8 rounded-full bg-white/90 text-neutral-600 shadow-soft-sm"
        : "size-8 rounded-full bg-black/10 text-neutral-700";
  return (
    <div className={cn("absolute right-3 top-3 flex items-center justify-center", styleClass)}>
      <X className="size-4" />
    </div>
  );
}

// Exactly mirrors apps/web/src/components/popups/popup-renderer.tsx's
// composition (image position TOP/LEFT/RIGHT/BACKGROUND, text/content
// alignment, CTA/countdown rendering) so what admin sees here is what
// actually ships -- reconstructed from PopupFormState rather than imported
// since apps/admin and apps/web are separate Next apps with no shared
// component layer between them.
export function PopupPreview({ form, device }: { form: PopupFormState; device: "desktop" | "mobile" }) {
  const fields = POPUP_TEMPLATE_FIELD_CONFIG[form.templateType];
  const width = Number(form.width) || 480;
  const frameWidth = device === "mobile" ? 360 : Math.min(width + 80, 640);

  const cardStyle: React.CSSProperties = {
    width: Math.min(width, frameWidth - 32),
    borderRadius: Number(form.borderRadius) || 0,
    backgroundColor: form.backgroundColor,
    height: form.autoHeight ? undefined : Number(form.height) || undefined,
  };

  const hasImage = fields.image && !!form.imageUrl;
  const isBackgroundImage = hasImage && form.imagePosition === "BACKGROUND";
  const isRowImage = hasImage && !isBackgroundImage && (form.imagePosition === "LEFT" || form.imagePosition === "RIGHT");

  const content = (
    <div
      className={cn("flex flex-1 flex-col gap-3 p-6", TEXT_ALIGN_CLASS[form.textAlign], ITEMS_ALIGN_CLASS[form.contentAlignment], isBackgroundImage && "text-white")}
    >
      {fields.heading && form.heading && <h3 className={cn("text-h4 font-semibold", !isBackgroundImage && "text-heading")}>{form.heading}</h3>}
      {fields.description && form.description && (
        <p className={cn("text-body-sm", isBackgroundImage ? "text-white/85" : "text-body")}>{form.description}</p>
      )}
      {fields.countdown && <PreviewCountdown dateStr={form.countdownEndDate} timeStr={form.countdownEndTime} timeZone={form.countdownTimezone} />}
      {form.ctaEnabled && form.ctaText && (
        <span
          className="mt-1 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-body-sm font-medium"
          style={{ color: form.buttonTextColor, backgroundColor: form.buttonBackgroundColor }}
        >
          {form.ctaText}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl p-6"
      style={{ width: frameWidth, minHeight: 320, backgroundColor: hexToRgba(form.overlayColor, Number(form.overlayOpacityPercent) / 100 || 0.6) }}
    >
      <div className="relative overflow-hidden shadow-soft-xl" style={cardStyle}>
        {form.templateType === "IMAGE_ONLY" ? (
          form.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, preview only
            <img src={form.imageUrl} alt="" className="block w-full" />
          ) : (
            <div className="flex h-40 items-center justify-center text-body-sm text-neutral-400">Upload an image to preview</div>
          )
        ) : isBackgroundImage ? (
          <div className="relative flex min-h-[220px] flex-col justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, preview only */}
            <img src={form.imageUrl!} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-black/45" aria-hidden />
            <div className="relative z-[1]">{content}</div>
          </div>
        ) : (
          <div className={cn("flex", isRowImage ? (form.imagePosition === "RIGHT" ? "flex-row-reverse" : "flex-row") : "flex-col")}>
            {hasImage && (
              <div className={cn("shrink-0 overflow-hidden", isRowImage ? "hidden w-2/5 sm:block" : "h-32 w-full")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, preview only */}
                <img src={form.imageUrl!} alt="" className="size-full object-cover" />
              </div>
            )}
            {content}
          </div>
        )}
        <CloseButtonPreview variant={form.closeButtonStyle} />
      </div>
    </div>
  );
}
