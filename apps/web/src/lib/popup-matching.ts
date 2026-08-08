import type { PopupDeviceTarget, PopupTargetingInput } from "@agency/types";

// Admin can enter either a relative path ("/services") or a full URL
// ("https://example.com/services") in the "Specific Pages"/"Specific URLs"
// targeting lists -- both are normalized down to a pathname so a single
// comparison covers whichever the admin happened to type.
function toPathname(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }
  return value;
}

function matchesAnyPath(pathname: string, values: string[]): boolean {
  return values.some((raw) => {
    const target = toPathname(raw);
    return pathname === target || pathname.startsWith(`${target}/`);
  });
}

export function matchesTargeting(pathname: string, targeting: PopupTargetingInput): boolean {
  switch (targeting.scope) {
    case "ALL":
      return true;
    case "HOME":
      return pathname === "/";
    case "SPECIFIC_PAGES":
      return matchesAnyPath(pathname, targeting.pages);
    case "SPECIFIC_URLS":
      return matchesAnyPath(pathname, targeting.urls);
    default:
      return true;
  }
}

// Breakpoints match this codebase's Tailwind sm(640)/lg(1024) usage
// elsewhere (e.g. SiteHeader's mobile-menu breakpoint) rather than
// introducing a new set of device thresholds.
export function matchesDevice(deviceTarget: PopupDeviceTarget): boolean {
  if (deviceTarget === "ALL" || typeof window === "undefined") return true;
  const width = window.innerWidth;
  if (deviceTarget === "MOBILE") return width < 640;
  if (deviceTarget === "TABLET") return width >= 640 && width < 1024;
  return width >= 1024; // DESKTOP
}
