import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";
import { ServiceCard } from "@/components/marketing/service-card";
import type { HomeContentRead, ServiceListItem } from "@/lib/types";

export function ServicesPreview({ services, home }: { services: ServiceListItem[]; home: HomeContentRead }) {
  return (
    <div>
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Heading level={2}>{home.servicesHeading ?? "What we **build**"}</Heading>
          <p className="mt-3 max-w-lg text-body-lg text-body">
            {home.servicesDescription ??
              "From marketing sites to full product builds — scoped, priced, and delivered on a real timeline."}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/services">
            {home.servicesButtonLabel ?? "All services"} <ArrowUpRight />
          </Link>
        </Button>
      </Reveal>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {services.slice(0, 4).map((service, i) => (
          <Reveal key={service.id} delay={i * 0.06}>
            <ServiceCard service={service} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
