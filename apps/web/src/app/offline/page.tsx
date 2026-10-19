import type { Metadata } from "next";
import { RefreshCw, WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

// Shown by the service worker when a page is opened without a connection and has not been visited before.
export default function OfflinePage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <WifiOff className="size-8" aria-hidden />
        </span>
        <h1 className="mt-6 font-heading text-h2 font-extrabold text-heading">You&apos;re offline</h1>
        <p className="mt-3 text-body text-neutral-500">Check your internet connection. Pages you have already opened still work; this one needs to be loaded once while you&apos;re online.</p>
        <a href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
          <RefreshCw className="size-4" aria-hidden /> Try again
        </a>
      </div>
    </section>
  );
}
