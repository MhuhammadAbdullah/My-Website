"use client";

import * as React from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FieldError,
  Heading,
  Input,
  Label,
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
  Textarea,
  toast,
} from "@agency/ui";
import { slugify } from "@agency/utils";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { GalleryField, VideoField, type GalleryImageItem, type VideoItem } from "./media-fields";

interface Category {
  id: string;
  name: string;
}
interface Technology {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  summary: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  categoryId: string | null;
  category: Category | null;
}

const caseStudyFields = [
  ["overview", "Overview"],
  ["problem", "Client problem"],
  ["research", "Research"],
  ["strategy", "Strategy"],
  ["planning", "Planning"],
  ["wireframesNote", "Wireframes"],
  ["designNotes", "Design"],
  ["developmentNotes", "Development"],
  ["challenges", "Challenges"],
  ["solutions", "Solutions"],
] as const;

// wireframesNote is the only optional case-study field — everything else is
// required by the Project model (see packages/database/prisma/schema.prisma).
const requiredCaseStudyKeys = caseStudyFields.filter(([key]) => key !== "wireframesNote").map(([key]) => key);

function ProjectEditor({
  project,
  categories,
  technologies,
  onClose,
  onSaved,
}: {
  project: Project | null;
  categories: Category[];
  technologies: Technology[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<Record<string, string>>({
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    client: project?.client ?? "",
    summary: project?.summary ?? "",
    categoryId: project?.categoryId ?? "",
    status: project?.status ?? "DRAFT",
    liveUrl: "",
    githubUrl: "",
    ...Object.fromEntries(caseStudyFields.map(([key]) => [key, ""])),
  });
  const [isFeatured, setIsFeatured] = React.useState(project?.isFeatured ?? false);
  const [technologyIds, setTechnologyIds] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<{ label: string; value: string }[]>([{ label: "", value: "" }]);
  const [gallery, setGallery] = React.useState<GalleryImageItem[]>([]);
  const [video, setVideo] = React.useState<VideoItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function validate(slug: string) {
    const nextErrors: Record<string, string> = {};
    if ((form.title ?? "").trim().length < 2) nextErrors.title = "Title must be at least 2 characters.";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      nextErrors.slug = "Slug must be lowercase, hyphen-separated (e.g. my-project).";
    }
    if (!(form.summary ?? "").trim()) nextErrors.summary = "Summary is required.";
    for (const [key, label] of caseStudyFields) {
      if (requiredCaseStudyKeys.includes(key) && !(form[key] ?? "").trim()) {
        nextErrors[key] = `${label} is required.`;
      }
    }
    return nextErrors;
  }

  React.useEffect(() => {
    if (!project) return;
    request<{ item: Project & Record<string, unknown> }>(`/projects/${project.slug}`).then(({ item }) => {
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(caseStudyFields.map(([key]) => [key, (item as Record<string, string>)[key] ?? ""])),
        liveUrl: (item.liveUrl as string) ?? "",
        githubUrl: (item.githubUrl as string) ?? "",
      }));
      setTechnologyIds(((item.techStack as { id: string }[]) ?? []).map((t) => t.id));
      if (Array.isArray(item.results) && item.results.length) setResults(item.results as { label: string; value: string }[]);

      const existingGallery = (item.gallery as
        | { url: string; publicId: string; width: number | null; height: number | null; caption: string | null }[]
        | undefined) ?? [];
      setGallery(
        existingGallery.map((image) => ({
          key: crypto.randomUUID(),
          url: image.url,
          publicId: image.publicId,
          width: image.width,
          height: image.height,
          caption: image.caption ?? "",
          status: "ready" as const,
        })),
      );

      const videoUrl = item.videoUrl as string | null;
      const videoPublicId = item.videoPublicId as string | null;
      setVideo(videoUrl && videoPublicId ? { url: videoUrl, publicId: videoPublicId, status: "ready" } : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  async function handleSave() {
    const slug = (form.slug ?? "").trim() || slugify(form.title ?? "");
    const nextErrors = validate(slug);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please fill in the highlighted required fields.");
      return;
    }
    if (gallery.some((img) => img.status === "uploading") || video?.status === "uploading") {
      toast.error("Please wait for uploads to finish before saving.");
      return;
    }
    setErrors({});
    setForm((f) => ({ ...f, slug }));

    setSaving(true);
    try {
      const payload = {
        ...form,
        slug,
        categoryId: form.categoryId || null,
        client: form.client || null,
        liveUrl: form.liveUrl || null,
        githubUrl: form.githubUrl || null,
        videoUrl: video?.url ?? null,
        videoPublicId: video?.publicId ?? null,
        isFeatured,
        techStackIds: technologyIds,
        relatedProjectIds: [],
        gallery: gallery.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          width: img.width,
          height: img.height,
          caption: img.caption || null,
        })),
        results: results.filter((r) => r.label.trim()),
        seo: { metaTitle: form.title, metaDescription: form.summary, keywords: [] },
      };

      if (project) {
        await request(`/projects/${project.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await request("/projects", { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success("Project saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                aria-invalid={!!errors.title}
              />
              <FieldError>{errors.title}</FieldError>
            </div>
            <div>
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Auto-generated from title if left blank"
                aria-invalid={!!errors.slug}
              />
              <FieldError>{errors.slug}</FieldError>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary *</Label>
            <Textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              aria-invalid={!!errors.summary}
            />
            <FieldError>{errors.summary}</FieldError>
          </div>

          {caseStudyFields.map(([key, label]) => {
            const required = requiredCaseStudyKeys.includes(key);
            return (
              <div key={key}>
                <Label>
                  {label} {required && "*"}
                </Label>
                <Textarea
                  rows={2}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  aria-invalid={!!errors[key]}
                />
                <FieldError>{errors[key]}</FieldError>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Live URL</Label>
              <Input value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} />
            </div>
            <div>
              <Label>GitHub URL</Label>
              <Input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
            </div>
          </div>

          <GalleryField images={gallery} setImages={setGallery} />

          <VideoField video={video} setVideo={setVideo} />

          <div>
            <Label>Tech stack</Label>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => {
                const active = technologyIds.includes(tech.id);
                return (
                  <button
                    type="button"
                    key={tech.id}
                    onClick={() =>
                      setTechnologyIds(active ? technologyIds.filter((id) => id !== tech.id) : [...technologyIds, tech.id])
                    }
                  >
                    <Badge variant={active ? "accent" : "neutral"}>{tech.name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Results</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setResults([...results, { label: "", value: "" }])}>
                <Plus className="size-4" /> Add result
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {results.map((r, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2">
                  <Input placeholder="Label" value={r.label} onChange={(e) => setResults(results.map((res, idx) => (idx === i ? { ...res, label: e.target.value } : res)))} />
                  <Input placeholder="Value" value={r.value} onChange={(e) => setResults(results.map((res, idx) => (idx === i ? { ...res, value: e.target.value } : res)))} />
                  <Button variant="ghost" size="icon" onClick={() => setResults(results.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-error-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2.5 pb-2.5">
              <Checkbox checked={isFeatured} onCheckedChange={(c) => setIsFeatured(c === true)} />
              <Label className="mb-0">Featured project</Label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const portfolioSortOptions = [
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "order", label: "Sort order" },
  { value: "createdAt", label: "Date created" },
  { value: "updatedAt", label: "Date updated" },
];
const portfolioStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

export default function PortfolioPage() {
  const { data: categories } = useAsyncData<Category[]>(
    () => request<{ items: Category[] }>("/categories/projects").then((r) => r.items),
    [],
  );
  const { data: technologies } = useAsyncData<Technology[]>(
    () => request<{ items: Technology[] }>("/categories/technologies").then((r) => r.items),
    [],
  );

  const list = usePaginatedList<Project>({
    endpoint: "/projects/admin",
    defaultSortBy: "order",
    defaultSortOrder: "asc",
    filterKeys: ["status", "categoryId", "isFeatured"],
  });

  const [editing, setEditing] = React.useState<Project | null | undefined>(undefined);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    try {
      await request(`/projects/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Portfolio</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Case studies shown on the Portfolio page.</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus /> Add project
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search title, client, or summary…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={portfolioSortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[
            { key: "status", label: "Status", options: portfolioStatusOptions },
            { key: "categoryId", label: "Category", options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })) },
            { key: "isFeatured", label: "Featured", options: [{ value: "true", label: "Featured only" }, { value: "false", label: "Not featured" }] },
          ]}
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
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.title}</TableCell>
                  <TableCell>{project.client ?? "—"}</TableCell>
                  <TableCell>{project.category?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === "PUBLISHED" ? "success" : "neutral"}>{project.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(project)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label="projects" />
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

      {editing !== undefined && (
        <ProjectEditor
          project={editing}
          categories={categories ?? []}
          technologies={technologies ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
