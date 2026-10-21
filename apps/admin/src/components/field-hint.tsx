"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agency/ui";

// Field instructions live behind a small info icon (shown on hover/focus) so every input stays on one tidy line.
// Plain counters such as "12 / 60" stay visible as text.
export function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Field instructions" className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-accent-500 focus-visible:text-accent-500">
          <Info className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-[12px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function FieldHint({ hint }: { hint: string }) {
  if (/^\s*[\d,.]+\s*(\/\s*[\d,.]+|chars?)?\s*$/i.test(hint)) return <span className="text-body-sm text-neutral-400">{hint}</span>;
  return <InfoHint text={hint} />;
}
