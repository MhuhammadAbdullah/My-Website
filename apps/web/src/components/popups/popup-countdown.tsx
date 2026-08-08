"use client";

import * as React from "react";

// `endAt` is an absolute timestamp, so every tick recomputes the remaining
// time from Date.now() rather than counting down from a fixed duration --
// a page refresh (or the popup re-mounting) never resets the clock.
export function PopupCountdown({
  endAt,
  textColor,
  onExpire,
}: {
  endAt: string;
  textColor?: string;
  onExpire?: () => void;
}) {
  const target = React.useMemo(() => new Date(endAt).getTime(), [endAt]);
  const [remaining, setRemaining] = React.useState(() => Math.max(0, target - Date.now()));
  const expiredRef = React.useRef(false);

  React.useEffect(() => {
    expiredRef.current = false;
    setRemaining(Math.max(0, target - Date.now()));

    const id = window.setInterval(() => {
      setRemaining(Math.max(0, target - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  React.useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const units: [number, string][] = [
    [days, "Days"],
    [hours, "Hours"],
    [minutes, "Minutes"],
    [seconds, "Seconds"],
  ];

  return (
    <div className="flex items-center justify-center gap-2" style={{ color: textColor }} aria-live="off">
      {units.map(([value, label], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-h4 font-semibold opacity-40">:</span>}
          <div className="flex flex-col items-center">
            <span className="font-mono text-h4 font-semibold tabular-nums">{String(value).padStart(2, "0")}</span>
            <span className="text-label uppercase opacity-60">{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
