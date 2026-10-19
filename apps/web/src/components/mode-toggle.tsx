"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

// Light / dark switch. The saved choice is applied before paint by a small script in the root layout;
// this button flips <html data-mode> and remembers the choice.
export function ModeToggle() {
  const [mode, setMode] = React.useState<"dark" | "light" | null>(null);

  React.useEffect(() => {
    setMode(document.documentElement.dataset.mode === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = (mode ?? "dark") === "dark" ? "light" : "dark";
    document.documentElement.dataset.mode = next;
    setMode(next);
    try {
      localStorage.setItem("site-mode", next);
    } catch {
      /* storage unavailable: the choice just lasts for this visit */
    }
  }

  const label = mode === "light" ? "Switch to dark mode" : "Switch to light mode";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className="flex size-10 shrink-0 items-center justify-center rounded-full text-heading hover:bg-neutral-100">
      {mode === "light" ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
    </button>
  );
}
