"use client";

import {
  Badge,
  Heading,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  message: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED" | "ARCHIVED";
  createdAt: string;
}

const statusOptions = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED", "ARCHIVED"];
const statusFilterOptions = statusOptions.map((v) => ({ value: v, label: v }));
const sortOptions = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Date received" },
  { value: "updatedAt", label: "Date updated" },
];

export default function AnalyticsPage() {
  const list = usePaginatedList<Submission>({
    endpoint: "/contact",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status", "country"],
  });

  async function updateStatus(id: string, status: string) {
    try {
      await request(`/contact/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success("Updated");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div>
      <Heading level={2}>Analytics</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Contact form submissions — the leading indicator we track today. Traffic and conversion analytics are a
        planned future module.
      </p>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search name, email, or message…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[{ key: "status", label: "Status", options: statusFilterOptions }]}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.name}</TableCell>
                  <TableCell>{sub.email}</TableCell>
                  <TableCell>{sub.phone}</TableCell>
                  <TableCell>{sub.country}</TableCell>
                  <TableCell>{sub.city}</TableCell>
                  <TableCell className="max-w-xs truncate">{sub.message}</TableCell>
                  <TableCell>{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select value={sub.status} onValueChange={(status) => updateStatus(sub.id, status)}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? (
                      <EmptyState hasActiveFilters label="submissions" />
                    ) : (
                      <Badge variant="neutral">No submissions yet</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!list.loading && !list.error && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}
    </div>
  );
}
