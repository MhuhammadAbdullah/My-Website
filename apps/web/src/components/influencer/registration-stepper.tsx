import { Check } from "lucide-react";
import { cn } from "@agency/ui";

// Horizontal timeline/progress stepper -- a connecting line (absolutely
// positioned from the previous dot's center to this one's, the standard
// `right-1/2 w-full` trick for equal-width grid cells) fills in accent color
// as steps complete, replacing the old flat row of numbered badges.
export function RegistrationStepper({ steps, currentStep }: { steps: readonly string[]; currentStep: number }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-1">
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <li key={label} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && (
              <div
                className={cn("absolute right-1/2 top-4 -z-10 h-px w-full", i <= currentStep ? "bg-accent-500" : "bg-neutral-200")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold ring-4 ring-background transition-colors",
                isComplete || isCurrent ? "bg-accent-500 text-white" : "bg-neutral-100 text-neutral-400",
              )}
            >
              {isComplete ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-label font-medium", isComplete || isCurrent ? "text-heading" : "text-neutral-400")}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
