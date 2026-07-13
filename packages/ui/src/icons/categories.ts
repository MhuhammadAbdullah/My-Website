// Lucide's npm package ships no tag/category metadata (that only exists in
// their source monorepo, not the published package), so category grouping
// here is a best-effort keyword classifier over the icon's kebab-case name
// rather than a hand-curated per-icon assignment -- it covers the entire
// catalog automatically, and search (which matches every icon regardless of
// category) remains the authoritative way to find a specific icon.

export const ICON_CATEGORIES = [
  "Security",
  "Healthcare",
  "Legal",
  "Finance",
  "Commerce",
  "Communication",
  "Media",
  "Files",
  "Navigation",
  "Travel",
  "Education",
  "Development",
  "Design",
  "Technology",
  "Tools",
  "Analytics",
  "Users",
  "Social",
  "Marketing",
  "Business",
  "General",
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

// Order matters: earlier categories are checked first, so put more specific
// compound keywords (e.g. Healthcare's "heart-pulse") ahead of categories
// with broad generic overlaps (e.g. Social's "heart").
const CATEGORY_KEYWORDS: Record<Exclude<IconCategory, "General">, string[]> = {
  Security: [
    "shield", "lock", "key", "fingerprint", "scan-face", "siren", "unlock",
    "ban", "eye-off", "octagon-alert", "alert-octagon", "verified", "spy",
  ],
  Healthcare: [
    "heart-pulse", "heart-handshake", "stethoscope", "pill", "syringe",
    "hospital", "cross", "thermometer", "bandage", "brain", "dna", "biohazard",
    "accessibility", "wheelchair", "ambulance",
  ],
  Legal: ["scale", "gavel", "copyright", "stamp", "contract", "vote", "landmark-flag"],
  Finance: [
    "dollar", "coin", "wallet", "credit-card", "bank", "receipt", "invoice",
    "piggy-bank", "banknote", "currency", "percent", "calculator", "landmark",
    "hand-coins", "circle-dollar", "badge-dollar", "euro", "pound-sterling",
    "japanese-yen", "indian-rupee", "russian-ruble", "swiss-franc",
  ],
  Commerce: [
    "shopping", "cart", "store", "tag", "package", "box", "truck", "gift",
    "barcode", "price-tag", "warehouse", "shirt", "basket",
  ],
  Communication: [
    "mail", "message", "phone", "chat", "send", "inbox", "voicemail", "mic",
    "headset", "bell", "rss", "at-sign", "reply", "forward", "signal",
  ],
  Media: [
    "image", "video", "camera", "film", "music", "headphones", "volume",
    "play", "pause", "disc", "clapperboard", "aperture", "gallery",
    "podcast", "speaker", "cast", "youtube", "audio",
  ],
  Files: ["file", "folder", "clipboard", "archive", "save", "paperclip", "notebook"],
  Navigation: [
    "arrow", "chevron", "menu", "compass", "navigation", "move", "corner",
    "route", "signpost", "milestone", "waypoints", "location", "map-pin", "pin",
  ],
  Travel: [
    "plane", "car", "train", "ship", "bus", "luggage", "hotel", "tent",
    "anchor", "fuel", "sailboat", "caravan", "bike", "footprints", "globe",
  ],
  Education: ["book", "graduation", "school", "pencil-ruler", "backpack", "library", "notebook-pen"],
  Development: [
    "code", "terminal", "git-", "bug", "brackets", "braces", "function",
    "variable", "regex", "webhook", "square-code", "file-code", "binary",
    "container", "square-terminal", "square-function", "component",
  ],
  Design: [
    "palette", "pen-tool", "brush", "paintbrush", "pipette", "crop",
    "layers", "layout", "ruler", "swatch", "shapes", "frame", "contrast",
    "droplet", "sliders", "wand", "eraser", "figma", "vector",
  ],
  Technology: [
    "cpu", "server", "database", "hard-drive", "memory-stick", "wifi",
    "bluetooth", "router", "chip", "satellite", "radio-tower", "antenna",
    "plug", "battery", "power", "bot", "robot", "scan", "usb", "ethernet",
    "microchip", "circuit",
  ],
  Tools: [
    "wrench", "hammer", "screwdriver", "settings", "cog", "toolbox",
    "drill", "scissors", "gauge", "wrench-", "nut", "bolt",
  ],
  Analytics: [
    "chart", "trending", "activity", "funnel", "percent-circle",
    "bar-chart", "line-chart", "pie-chart", "presentation",
  ],
  Users: ["user", "users", "person", "contact", "id-card", "baby", "smile"],
  Social: ["thumbs", "share-2", "heart", "star", "medal", "award", "trophy", "flame", "crown"],
  Marketing: [
    "megaphone", "target", "trending-up", "speaker-loud", "rocket",
    "flag", "sparkle", "zap", "badge-check", "handshake",
  ],
  Business: [
    "briefcase", "building", "office", "factory", "presentation-chart",
    "graph", "corporate", "meeting", "check-check",
  ],
};

export function categorizeIcon(kebabName: string): IconCategory {
  for (const category of ICON_CATEGORIES) {
    if (category === "General") continue;
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((keyword) => kebabName.includes(keyword))) {
      return category;
    }
  }
  return "General";
}
