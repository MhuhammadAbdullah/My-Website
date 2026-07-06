"use client";

import { Heading, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface SeoRow {
  id: string;
  slug: string;
  seo?: { metaTitle: string; metaDescription: string } | null;
}

export default function SeoOverviewPage() {
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
      <Heading level={2}>SEO</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Meta title and description are edited per-item from the Services and Portfolio pages (and Home / About for
        those pages). This is a read-only overview of what's currently set.
      </p>

      {loading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : (
        <div className="mt-8 space-y-10">
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
