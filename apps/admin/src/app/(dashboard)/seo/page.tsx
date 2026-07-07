"use client";

import {
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { PageSeoForm } from "@/components/seo/page-seo-form";

interface SeoRow {
  id: string;
  slug: string;
  seo?: { metaTitle: string; metaDescription: string } | null;
}

function ItemsOverview() {
  const { data, loading } = useAsyncData<{ services: SeoRow[]; projects: SeoRow[] }>(async () => {
    // limit=100: this is a read-only overview of every item, not a paginated
    // table — /admin now paginates at 10 by default, so ask for everything.
    const [services, projects] = await Promise.all([
      request<{ items: SeoRow[] }>("/services/admin?limit=100").then((r) => r.items),
      request<{ items: SeoRow[] }>("/projects/admin?limit=100").then((r) => r.items),
    ]);
    return { services, projects };
  }, []);

  return (
    <div>
      <p className="max-w-2xl text-body-sm text-neutral-500">
        Meta title and description for individual services and portfolio projects are edited per-item from the
        Services and Portfolio pages. This is a read-only overview of what's currently set.
      </p>

      {loading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : (
        <div className="mt-6 space-y-10">
          {(["services", "projects"] as const).map((key) => (
            <div key={key}>
              <h3 className="font-mono text-label uppercase tracking-wide text-neutral-400">{key}</h3>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Meta title</TableHead>
                    <TableHead>Meta description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.[key].map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>/{row.slug}</TableCell>
                      <TableCell>{row.seo?.metaTitle ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.seo?.metaDescription ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_TABS = [
  { key: "services", label: "Services" },
  { key: "portfolio", label: "Portfolio" },
  { key: "affiliate-tools", label: "Affiliate Tools" },
  { key: "contact", label: "Contact" },
] as const;

export default function SeoOverviewPage() {
  return (
    <div>
      <Heading level={2}>SEO</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Manage search and social metadata for each page. Home and About are managed from their own pages.
      </p>

      <Tabs defaultValue="services" className="mt-6">
        <TabsList>
          {PAGE_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="items">Items overview</TabsTrigger>
        </TabsList>

        {PAGE_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <PageSeoForm pageKey={tab.key} label={tab.label} />
          </TabsContent>
        ))}

        <TabsContent value="items">
          <ItemsOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
