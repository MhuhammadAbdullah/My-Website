import * as React from "react";
import { cn } from "./lib/cn";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[var(--layout-max)] px-[var(--layout-pad)]", className)} {...props} />;
}

export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-section", className)} {...props} />;
}
