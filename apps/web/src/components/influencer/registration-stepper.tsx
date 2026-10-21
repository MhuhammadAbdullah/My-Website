import { Check } from "lucide-react";
import { cn } from "@agency/ui";

// Progress stepper: the connecting line fills with the accent colour as steps are completed, and the current dot pulses.
export function RegistrationStepper({ steps, currentStep }: { steps: readonly string[]; currentStep: number }) {
  return (
    <ol className="mb-8 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <li key={label} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && (
              <div className="absolute right-1/2 top-4 -z-10 h-0.5 w-full overflow-hidden bg-neutral-200">
                <div className="h-full bg-accent-500 transition-[width] duration-500 ease-out" style={{ width: i <= currentStep ? "100%" : "0%" }} />
              </div>
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold ring-4 ring-background transition-all duration-300",
                isComplete || isCurrent ? "bg-accent-500 text-on-accent" : "bg-neutral-100 text-neutral-400",
                isCurrent && "scale-110",
              )}
            >
              {isComplete ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-label font-medium transition-colors", isComplete || isCurrent ? "text-heading" : "text-neutral-400")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
