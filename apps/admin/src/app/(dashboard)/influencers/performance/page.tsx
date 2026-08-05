"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Heading,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface PerformanceRow {
  influencerId: string;
  name: string;
  username: string | null;
  isFeatured: boolean;
  featuredOrder: number;
  score: number;
  totalFollowers: number;
  avgEngagement: number;
  completedCampaigns: number;
  revenue: number;
  ratingAverage: number;
  repeatClients: number;
}

export default function InfluencerPerformancePage() {
  const { data: rows, loading, reload } = useAsyncData<PerformanceRow[]>(
    () => request<{ items: PerformanceRow[] }>("/influencer-badges/admin/performance").then((r) => r.items),
    [],
  );
  const [running, setRunning] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  async function handleRunScoring() {
    setRunning(true);
    try {
      const result = await request<{ recommended: number; cleared: number }>("/influencer-badges/admin/run-scoring", { method: "POST" });
      toast.success(`Scoring pass complete — ${result.recommended} new recommendation(s), ${result.cleared} cleared.`);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  async function toggleFeatured(row: PerformanceRow) {
    setTogglingId(row.influencerId);
    try {
      await request(`/influencers/admin/${row.influencerId}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: !row.isFeatured }),
      });
      toast.success(row.isFeatured ? "Removed from featured" : "Marked as featured");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Performance</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Ranked by a composite score across followers, engagement, completed campaigns, ratings, revenue, and repeat clients. Run a
            scoring pass to refresh badge recommendations, or manually feature an influencer regardless of rank.
          </p>
        </div>
        <Button onClick={handleRunScoring} disabled={running}>
          {running ? "Running…" : "Run scoring pass"}
        </Button>
      </div>

      <div className="mt-6">
        {loading || !rows ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Influencer</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Repeat clients</TableHead>
                <TableHead className="text-right">Featured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.influencerId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {row.username ? `@${row.username}` : row.name}
                      {row.isFeatured && <Badge variant="dark">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{row.totalFollowers.toLocaleString()}</TableCell>
                  <TableCell>{row.avgEngagement.toFixed(1)}%</TableCell>
                  <TableCell>{row.completedCampaigns}</TableCell>
                  <TableCell>{row.revenue.toLocaleString()}</TableCell>
                  <TableCell>{row.ratingAverage.toFixed(1)}</TableCell>
                  <TableCell>{row.repeatClients}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={row.isFeatured} disabled={togglingId === row.influencerId} onCheckedChange={() => toggleFeatured(row)} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-neutral-400">
                    No approved influencers yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
