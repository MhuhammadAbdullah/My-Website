import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-h2 font-semibold text-heading">You&apos;re offline</h1>
        <p className="mt-3 text-body text-neutral-500">The admin panel needs an internet connection. Reconnect and try again.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-neutral-900 px-6 py-3 text-body-sm font-semibold text-white">
          Try again
        </a>
      </div>
    </main>
  );
}
