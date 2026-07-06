import Link from "next/link";
import { Check } from "lucide-react";
import { Button, Reveal, cn } from "@agency/ui";
import { billingSuffix } from "@/lib/currency";
import { Price } from "@/components/marketing/price";
import type { PricingPlanRead } from "@/lib/types";

export function PricingGrid({ plans }: { plans: PricingPlanRead[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan, i) => {
        const hasDiscount = plan.discountPrice != null && plan.regularPrice != null && plan.discountPrice < plan.regularPrice;
        return (
        <Reveal
          key={plan.id}
          delay={i * 0.06}
          className={cn(
            "flex h-full flex-col rounded-2xl border p-6",
            plan.isFeatured
              ? "border-transparent bg-neutral-950 text-white shadow-soft-xl"
              : "border-neutral-200 bg-background",
          )}
        >
          <p className={cn("font-mono text-label uppercase tracking-wide", plan.isFeatured ? "text-accent-300" : "text-neutral-400")}>
            {plan.name}
          </p>
          <p className={cn("mt-3 flex flex-wrap items-baseline gap-x-2 text-h3 font-semibold", plan.isFeatured ? "text-white" : "text-heading")}>
            {plan.isCustomQuote || plan.regularPrice == null ? (
              <span>{plan.priceLabel ?? "Let's talk"}</span>
            ) : (
              <>
                {hasDiscount && (
                  <Price
                    amount={plan.regularPrice}
                    currency={plan.currency}
                    className="text-body font-normal text-neutral-400 line-through"
                  />
                )}
                <Price amount={hasDiscount ? plan.discountPrice! : plan.regularPrice} currency={plan.currency} />
                <span className="text-body-sm font-normal text-neutral-400">{billingSuffix(plan.billingType)}</span>
              </>
            )}
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-body-sm">
                <Check className={cn("mt-0.5 size-4 shrink-0", plan.isFeatured ? "text-accent-400" : "text-accent-500")} />
                <span className={plan.isFeatured ? "text-neutral-300" : "text-body"}>{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="mt-8"
            variant={plan.isFeatured ? "accent" : "outline"}
          >
            <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
          </Button>
        </Reveal>
        );
      })}
    </div>
  );
}
