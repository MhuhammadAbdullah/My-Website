import type { AnnouncementBarSettings } from "./types";

// Shared by AnnouncementBar (renders the marquee) and SiteChrome (decides
// how much to push the header/main content down) so both agree on exactly
// when the bar is actually visible -- disabled, or enabled with only blank
// lines, means no bar and no layout offset either.
export function getVisibleAnnouncementMessages(settings: AnnouncementBarSettings | undefined): string[] {
  if (!settings?.enabled) return [];
  return settings.messages.map((m) => m.trim()).filter(Boolean);
}
