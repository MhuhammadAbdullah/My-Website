"use client";

import { Briefcase, FolderKanban, Mail, Quote } from "lucide-react";
import { Heading, Card, CardContent, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface DashboardCounts {
  services: number;
  projects: number;
  testimonials: number;
  submissions: number;
}

function StatCard({ label, value, icon: Icon, loading }: { label: string; value: number; icon: typeof Briefcase; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-body-sm text-neutral-500">{label}</p>
          {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-h2 font-semibold text-heading">{value}</p>}
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading } = useAsyncData<DashboardCounts>(async () => {
    // All four endpoints are paginated now — `total` is the accurate count of
    // every row regardless of page size, unlike `items.length` (page-sized).
    const [services, projects, testimonials, submissions] = await Promise.all([
      request<{ total: number }>("/services/admin?limit=1"),
      request<{ total: number }>("/projects/admin?limit=1"),
      request<{ total: number }>("/testimonials/admin?limit=1"),
      request<{ total: number }>("/contact?limit=1"),
    ]);
    return {
      services: services.total,
      projects: projects.total,
      testimonials: testimonials.total,
      submissions: submissions.total,
    };
  }, []);

  return (
    <div>
      <Heading level={2}>Dashboard</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">A quick snapshot of what's live on the site.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Services" value={data?.services ?? 0} icon={Briefcase} loading={loading} />
        <StatCard label="Portfolio projects" value={data?.projects ?? 0} icon={FolderKanban} loading={loading} />
        <StatCard label="Testimonials" value={data?.testimonials ?? 0} icon={Quote} loading={loading} />
        <StatCard label="New contact submissions" value={data?.submissions ?? 0} icon={Mail} loading={loading} />
      </div>
    </div>
  );
}
