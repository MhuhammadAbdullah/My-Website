// Wraps a server-side data fetch so a temporarily unavailable API degrades to
// a fallback value instead of throwing. This matters most for anything awaited
// in the root layout or a statically-generated page: an uncaught rejection
// there fails the entire prerender (and on Vercel, the whole build) rather
// than just the one section of one page that wanted the data. ISR still
// revalidates on the normal schedule once the API is reachable again, so the
// fallback is only ever seen during an actual outage at build/revalidate time.
export async function withFallback<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[web] Failed to load ${label} — using fallback.`, error instanceof Error ? error.message : error);
    return fallback;
  }
}
