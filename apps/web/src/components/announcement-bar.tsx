"use client";

import { X } from "lucide-react";
import type { AnnouncementBarSettings } from "@/lib/types";
import { getVisibleAnnouncementMessages } from "@/lib/announcement";

// Same CSS-only seamless-loop technique as TechMarquee/ReviewsMarquee --
// duplicating the message list once and translating the track by exactly
// -50% makes the loop boundary indistinguishable from the gap between any
// other two messages. Fixed h-8 so SiteHeader/SiteChrome can offset by an
// exact, known amount rather than measuring this at runtime.
export function AnnouncementBar({
  settings,
  onDismiss,
}: {
  settings: AnnouncementBarSettings | undefined;
  /** Provided only when the bar is dismissible; SiteChrome remembers the choice. */
  onDismiss?: () => void;
}) {
  const messages = getVisibleAnnouncementMessages(settings);
  if (messages.length === 0) return null;

  const doubled = [...messages, ...messages];
  const track = (
    <div className="announcement-marquee-track flex h-full w-max items-center">
      {doubled.map((message, i) => (
        <span key={i} aria-hidden={i >= messages.length} className="flex shrink-0 items-center whitespace-nowrap text-body-sm font-medium">
          {message}
          <span aria-hidden className="mx-6 opacity-40">
            •
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="fixed inset-x-0 top-0 z-[60] h-8 overflow-hidden"
      style={{ backgroundColor: settings!.backgroundColor, color: settings!.textColor }}
    >
      {settings!.link ? (
        <a href={settings!.link} className="block h-full" {...(/^https?:/i.test(settings!.link) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {track}
        </a>
      ) : (
        track
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ backgroundColor: settings!.backgroundColor }}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
