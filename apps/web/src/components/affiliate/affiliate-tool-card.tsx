import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@agency/ui";
import type { AffiliateToolRead } from "@/lib/types";

export function AffiliateToolCard({ tool }: { tool: AffiliateToolRead }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{tool.category.name}</Badge>
          {tool.isFeatured && <Badge variant="accent">Featured</Badge>}
        </div>
        <CardTitle>{tool.name}</CardTitle>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="flex-1 space-y-1.5 text-body-sm text-body">
          {tool.benefits.map((benefit) => (
            <li key={benefit}>· {benefit}</li>
          ))}
        </ul>
        {tool.specialOffer && (
          <Badge variant="success" className="mt-4 w-fit">
            {tool.specialOffer}
          </Badge>
        )}
        <Button asChild className="mt-5">
          <Link href={tool.ctaUrl} target="_blank" rel="noreferrer sponsored">
            {tool.ctaLabel} <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
