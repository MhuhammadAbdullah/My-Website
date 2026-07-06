import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@agency/ui";
import { billingSuffix } from "@/lib/currency";
import { Price } from "@/components/marketing/price";
import type { PricingPlanRead, ServiceListItem } from "@/lib/types";

// The listing card shows "the" price for a service — the cheapest concrete
// plan, since that's what a "From $X" figure traditionally communicates.
// Custom-quote-only services (no fixed price at all) show no price row.
function cheapestPlan(plans: PricingPlanRead[]): PricingPlanRead | null {
  const priced = plans.filter((p) => !p.isCustomQuote && p.regularPrice != null);
  if (priced.length === 0) return null;
  return priced.reduce((min, p) => (p.regularPrice! < min.regularPrice! ? p : min));
}

export function ServiceCard({ service }: { service: ServiceListItem }) {
  const plan = cheapestPlan(service.pricingPlans);
  const hasDiscount = plan?.discountPrice != null && plan.regularPrice != null && plan.discountPrice < plan.regularPrice;

  return (
    <Link href={`/services/${service.slug}`}>
      <Card className="h-full">
        <CardHeader>
          {service.category && <Badge variant="accent">{service.category.name}</Badge>}
          <CardTitle className="flex items-center justify-between gap-2">
            {service.name}
            <ArrowUpRight className="size-4 shrink-0 text-neutral-300 transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-500" />
          </CardTitle>
          <CardDescription>{service.tagline}</CardDescription>
        </CardHeader>
        {plan && (
          <CardContent>
            <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-label uppercase tracking-wide text-neutral-400">
              {plan.priceLabel ?? "From"}{" "}
              <Price
                amount={hasDiscount ? plan.discountPrice! : plan.regularPrice!}
                currency={plan.currency}
                className="text-heading"
              />
              {hasDiscount && (
                <Price amount={plan.regularPrice!} currency={plan.currency} className="text-neutral-300 line-through" />
              )}
              {billingSuffix(plan.billingType)}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
