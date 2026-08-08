import type { AnnouncementBarSettings } from "@/lib/types";
import { getVisibleAnnouncementMessages } from "@/lib/announcement";

// Same CSS-only seamless-loop technique as TechMarquee/ReviewsMarquee --
// duplicating the message list once and translating the track by exactly
// -50% makes the loop boundary indistinguishable from the gap between any
// other two messages. Fixed h-8 so SiteHeader/SiteChrome can offset by an
// exact, known amount rather than measuring this at runtime.
export function AnnouncementBar({ settings }: { settings: AnnouncementBarSettings | undefined }) {
  const messages = getVisibleAnnouncementMessages(settings);
  if (messages.length === 0) return null;

  const doubled = [...messages, ...messages];

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-8 overflow-hidden"
      style={{ backgroundColor: settings!.backgroundColor, color: settings!.textColor }}
    >
      <div className="announcement-marquee-track flex h-full w-max items-center">
        {doubled.map((message, i) => (
          <span
            key={i}
            aria-hidden={i >= messages.length}
            className="flex shrink-0 items-center whitespace-nowrap text-body-sm font-medium"
          >
            {message}
            <span aria-hidden className="mx-6 opacity-40">
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
