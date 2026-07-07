export type DateRangePreset = "today" | "week" | "month" | "year" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  x.setDate(x.getDate() - diff);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function startOfQuarter(d: Date) {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export type ReportDateRangePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"
  | "custom";

// Reports has its own resolver (rather than reusing resolveDateRange above)
// because it needs a wider preset list *and* an "all time" default (no
// filtering at all) when nothing is selected -- resolveDateRange always
// falls back to "this month" for the dashboard chart, which isn't the right
// default for a full financial report.
export function resolveReportDateRange(preset: string | undefined, fromStr?: string, toStr?: string): DateRange | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = addDays(now, -1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "last7days":
      return { start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
    case "last30days":
      return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "lastMonth": {
      const lastMonthEnd = new Date(startOfMonth(now).getTime() - 1);
      return { start: startOfMonth(lastMonthEnd), end: endOfDay(lastMonthEnd) };
    }
    case "thisQuarter":
      return { start: startOfQuarter(now), end: endOfDay(now) };
    case "thisYear":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom": {
      if (!fromStr && !toStr) return null;
      const start = fromStr ? startOfDay(new Date(fromStr)) : startOfMonth(now);
      const end = toStr ? endOfDay(new Date(toStr)) : endOfDay(now);
      return { start, end };
    }
    default:
      return null;
  }
}

export function resolveDateRange(preset: string | undefined, fromStr?: string, toStr?: string): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now), end: endOfDay(now) };
    case "year":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom": {
      const start = fromStr ? startOfDay(new Date(fromStr)) : startOfMonth(now);
      const end = toStr ? endOfDay(new Date(toStr)) : endOfDay(now);
      return { start, end };
    }
    case "month":
    default:
      return { start: startOfMonth(now), end: endOfDay(now) };
  }
}

// Daily buckets for short ranges (<=31 days), monthly buckets otherwise --
// keeps trend charts readable whether the user picked "Today" or "This Year".
export function buildDateBuckets({ start, end }: DateRange): DateBucket[] {
  const spanDays = (end.getTime() - start.getTime()) / 86400000;
  const buckets: DateBucket[] = [];

  if (spanDays <= 31) {
    const cursor = startOfDay(start);
    while (cursor <= end) {
      const bucketStart = new Date(cursor);
      const bucketEnd = endOfDay(cursor);
      buckets.push({
        key: bucketStart.toISOString().slice(0, 10),
        label: bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        start: bucketStart,
        end: bucketEnd,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = startOfMonth(start);
    while (cursor <= end) {
      const bucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        key: `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, "0")}`,
        label: bucketStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        start: bucketStart,
        end: bucketEnd,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return buckets;
}
