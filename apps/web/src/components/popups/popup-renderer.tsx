"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@agency/ui";
import {
  POPUP_TEMPLATE_FIELD_CONFIG,
  type PopupCloseButtonStyle,
  type PopupDesignInput,
  type PopupTextAlignment,
} from "@agency/types";
import type { PopupRead } from "@/lib/types";
import { PopupCountdown } from "./popup-countdown";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = Number.parseInt(full.slice(0, 2), 16) || 0;
  const g = Number.parseInt(full.slice(2, 4), 16) || 0;
  const b = Number.parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TEXT_ALIGN_CLASS: Record<PopupTextAlignment, string> = { LEFT: "text-left", CENTER: "text-center", RIGHT: "text-right" };
const ITEMS_ALIGN_CLASS: Record<PopupTextAlignment, string> = { LEFT: "items-start", CENTER: "items-center", RIGHT: "items-end" };

function CloseButton({ variant, onClick }: { variant: PopupCloseButtonStyle; onClick: () => void }) {
  const styleClass =
    variant === "MINIMAL"
      ? "size-7 text-neutral-500 hover:text-heading"
      : variant === "CIRCLE"
        ? "size-8 rounded-full bg-white/90 text-neutral-600 shadow-soft-sm hover:bg-white"
        : "size-8 rounded-full bg-black/10 text-neutral-700 backdrop-blur-sm hover:bg-black/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("absolute right-3 top-3 z-10 flex items-center justify-center transition-colors", styleClass)}
      aria-label="Close"
    >
      <X className="size-4" />
    </button>
  );
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function PopupShell({
  design,
  closeOnOverlayClick,
  closeButtonStyle,
  ariaLabel,
  onClose,
  children,
}: {
  design: PopupDesignInput;
  closeOnOverlayClick: boolean;
  closeButtonStyle: PopupCloseButtonStyle;
  ariaLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Focus trap: moves focus into the popup on open, cycles Tab/Shift+Tab
  // between its own focusable elements only (background interaction is
  // otherwise already blocked by the overlay + body scroll-lock in
  // PopupRenderer, but a sighted keyboard user could still Tab into page
  // content hidden behind the overlay without this), and restores focus to
  // whatever triggered the popup once it closes.
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: hexToRgba(design.overlayColor, design.overlayOpacity) }}
        onClick={() => closeOnOverlayClick && onClose()}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full overflow-hidden shadow-soft-xl"
          style={{
            maxWidth: design.width,
            height: design.autoHeight ? undefined : (design.height ?? undefined),
            borderRadius: design.borderRadius,
            backgroundColor: design.backgroundColor,
          }}
        >
          {children}
          <CloseButton variant={closeButtonStyle} onClick={onClose} />
        </div>
      </div>
    </>
  );
}

function ContentBlock({
  popup,
  expired,
  ctaDisabled,
  light,
  onCtaClick,
  onExpire,
}: {
  popup: PopupRead;
  expired: boolean;
  ctaDisabled: boolean;
  light: boolean;
  onCtaClick: () => void;
  onExpire: () => void;
}) {
  const fields = POPUP_TEMPLATE_FIELD_CONFIG[popup.templateType];
  const { design } = popup;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-3 p-6",
        TEXT_ALIGN_CLASS[design.textAlign],
        ITEMS_ALIGN_CLASS[design.contentAlignment],
        light && "text-white",
      )}
    >
      {fields.heading && popup.heading && <h3 className={cn("text-h4 font-semibold", !light && "text-heading")}>{popup.heading}</h3>}
      {fields.description && popup.description && (
        <p className={cn("text-body-sm", light ? "text-white/85" : "text-body")}>{popup.description}</p>
      )}
      {fields.countdown && popup.countdownEndAt && (
        <>
          {expired && popup.countdownExpiryAction === "SHOW_MESSAGE" ? (
            <p className={cn("text-body-sm font-medium", light ? "text-white" : "text-heading")}>{popup.countdownExpiryMessage}</p>
          ) : expired && popup.countdownExpiryAction === "HIDE_POPUP" ? null : (
            <PopupCountdown endAt={popup.countdownEndAt} textColor={light ? "#ffffff" : undefined} onExpire={onExpire} />
          )}
        </>
      )}
      {popup.ctaEnabled && popup.ctaText && popup.ctaUrl && (
        <a
          href={ctaDisabled ? undefined : popup.ctaUrl}
          target={popup.ctaOpenNewTab ? "_blank" : undefined}
          rel={popup.ctaOpenNewTab ? "noopener noreferrer" : undefined}
          onClick={ctaDisabled ? (e) => e.preventDefault() : onCtaClick}
          aria-disabled={ctaDisabled}
          className={cn(
            "mt-1 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-body-sm font-medium transition-opacity",
            ctaDisabled && "pointer-events-none opacity-50",
          )}
          style={{ color: design.buttonTextColor, backgroundColor: design.buttonBackgroundColor }}
        >
          {popup.ctaText}
        </a>
      )}
    </div>
  );
}

export function PopupRenderer({
  popup,
  onClose,
  onCtaClick,
}: {
  popup: PopupRead;
  onClose: () => void;
  onCtaClick: () => void;
}) {
  const [expired, setExpired] = React.useState(false);
  const fields = POPUP_TEMPLATE_FIELD_CONFIG[popup.templateType];
  const { design } = popup;

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function handleExpire() {
    setExpired(true);
    if (popup.countdownExpiryAction === "HIDE_POPUP") onClose();
  }

  const ctaDisabled = expired && popup.countdownExpiryAction === "DISABLE_CTA";

  // Image-only has no heading/description/countdown at all (per template
  // spec) -- the image itself is the whole popup, optionally clickable.
  if (popup.templateType === "IMAGE_ONLY") {
    if (!popup.image) return null;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, popup dimensions are admin-controlled, not fixed
      <img src={popup.image.url} alt={popup.image.altText ?? ""} className="block w-full" />
    );
    return (
      <PopupShell design={design} closeOnOverlayClick={popup.closeOnOverlayClick} closeButtonStyle="DEFAULT" ariaLabel="Promotional popup" onClose={onClose}>
        {popup.imageLinkUrl ? (
          <a href={popup.imageLinkUrl} onClick={onCtaClick}>
            {img}
          </a>
        ) : (
          img
        )}
      </PopupShell>
    );
  }

  const hasImage = fields.image && !!popup.image;
  const isBackgroundImage = hasImage && design.imagePosition === "BACKGROUND";
  const isRowImage = hasImage && !isBackgroundImage && (design.imagePosition === "LEFT" || design.imagePosition === "RIGHT");

  return (
    <PopupShell
      design={design}
      closeOnOverlayClick={popup.closeOnOverlayClick}
      closeButtonStyle={design.closeButtonStyle}
      ariaLabel={popup.heading ?? "Promotional popup"}
      onClose={onClose}
    >
      {isBackgroundImage ? (
        <div className="relative flex min-h-[280px] flex-col justify-end">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL */}
          <img src={popup.image!.url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black/45" aria-hidden />
          <div className="relative z-[1]">
            <ContentBlock popup={popup} expired={expired} ctaDisabled={ctaDisabled} light onCtaClick={onCtaClick} onExpire={handleExpire} />
          </div>
        </div>
      ) : (
        <div className={cn("flex", isRowImage ? (design.imagePosition === "RIGHT" ? "flex-row-reverse" : "flex-row") : "flex-col")}>
          {hasImage && (
            <div className={cn("shrink-0 overflow-hidden", isRowImage ? "hidden w-2/5 sm:block" : "h-44 w-full")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL */}
              <img src={popup.image!.url} alt={popup.image!.altText ?? ""} className="size-full object-cover" />
            </div>
          )}
          <ContentBlock popup={popup} expired={expired} ctaDisabled={ctaDisabled} light={false} onCtaClick={onCtaClick} onExpire={handleExpire} />
        </div>
      )}
    </PopupShell>
  );
}
