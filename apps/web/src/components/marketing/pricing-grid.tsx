import { CmsButton } from "@/components/sections/cms-button";
import { PricingPackageCard } from "@/components/sections/pricing";
import { billingSuffix } from "@/lib/currency";
import type { PricingPlanRead } from "@/lib/types";
import { Price } from "@/components/marketing/price";

export function PricingGrid({ plans }: { plans: PricingPlanRead[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, index) => {
        const hasDiscount = plan.discountPrice != null && plan.regularPrice != null && plan.discountPrice < plan.regularPrice;
        const isQuote = plan.isCustomQuote || plan.regularPrice == null;

        return (
          <PricingPackageCard
            key={plan.id}
            index={index}
            card={{
              title: plan.name,
              pricePrefix: isQuote ? undefined : "from",
              price: isQuote ? (plan.priceLabel ?? "Let's talk") : (
                <>
                  {hasDiscount && (
                    <Price
                      amount={plan.regularPrice!}
                      currency={plan.currency}
                      className="mr-2 text-body font-normal text-neutral-400 line-through"
                    />
                  )}
                  <Price amount={hasDiscount ? plan.discountPrice! : plan.regularPrice!} currency={plan.currency} />
                </>
              ),
              billingNote: isQuote ? "Tailored to your project" : billingSuffix(plan.billingType) || "One-time project",
              features: plan.features,
              highlighted: plan.isFeatured,
              badge: plan.isFeatured ? "Most popular" : undefined,
              action: (
                <CmsButton
                  button={{ label: plan.ctaLabel, href: plan.ctaHref }}
                  onAccent={plan.isFeatured}
                  className="w-full justify-center"
                />
              ),
            }}
          />
        );
      })}
    </div>
  );
}
