"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, FileVideo, GripVertical, Play, Plus, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, Label, Skeleton, Switch, cn, toast } from "@agency/ui";
import type { InfluencerPortfolioItemInput, InfluencerSelfProfileInput } from "@agency/types";
import { getInfluencerMe, signProfileMediaUpload, updateInfluencerProfile, type UploadedRawMedia } from "@/lib/influencer-api";
import type { InfluencerMeRead, InfluencerPortfolioItemRead, InfluencerPortfolioMediaRead } from "@/lib/influencer-types";
import { VideoUploader } from "@/components/influencer/media-uploaders";

type DraftMedia = UploadedRawMedia | InfluencerPortfolioMediaRead;

function toMediaPayload(media: DraftMedia) {
  return {
    publicId: media.publicId,
    url: media.url,
    width: media.width,
    height: media.height,
    format: media.format,
    bytes: media.bytes,
    altText: "altText" in media ? media.altText : undefined,
  };
}

function itemToInput(item: InfluencerPortfolioItemRead): InfluencerPortfolioItemInput {
  return { media: toMediaPayload(item.media), isPublic: item.isPublic };
}

function SortablePortfolioRow({
  item,
  index,
  confirmingDelete,
  saving,
  onPreview,
  onToggleVisibility,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: InfluencerPortfolioItemRead;
  index: number;
  confirmingDelete: boolean;
  saving: boolean;
  onPreview: () => void;
  onToggleVisibility: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50">
      <button type="button" onClick={onPreview} aria-label={`Play video ${index + 1}`} className="group relative block aspect-[9/16] w-full overflow-hidden bg-neutral-100">
        {item.media.url ? (
          // The first frame stands in for a thumbnail.
          <video src={`${item.media.url}#t=0.5`} preload="metadata" muted playsInline className={cn("size-full object-cover transition-opacity", !item.isPublic && "opacity-50")} />
        ) : (
          <FileVideo className="mx-auto size-8 text-neutral-400" aria-hidden />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/25">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-500 text-on-accent shadow-lg">
            <Play className="size-5 translate-x-0.5 fill-current" aria-hidden />
          </span>
        </span>
        <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider", item.isPublic ? "bg-accent-500 text-on-accent" : "bg-black/60 text-white")}>
          {item.isPublic ? "Public" : "Hidden"}
        </span>
      </button>

      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-neutral-400 hover:text-heading" aria-label="Drag to reorder">
          <GripVertical className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate font-heading text-body font-extrabold tracking-tight text-heading">Video {index + 1}</p>
        <label className="flex cursor-pointer items-center gap-2 text-label font-semibold text-neutral-500">
          {item.isPublic ? <Eye className="size-4 text-accent-500" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          <Switch checked={item.isPublic} onCheckedChange={onToggleVisibility} aria-label={item.isPublic ? "Visible on your public profile" : "Hidden from your public profile"} />
        </label>
        <button type="button" onClick={onAskDelete} aria-label="Delete video" className="flex size-8 items-center justify-center rounded-full border border-neutral-200 text-error-500 hover:border-error-500">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      {confirmingDelete && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-error-500/30 bg-error-500/10 px-4 py-3">
          <p className="text-body-sm font-semibold text-error-700">Delete this video?</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={onConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InfluencerPortfolioPage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [items, setItems] = React.useState<InfluencerPortfolioItemRead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [addOpen, setAddOpen] = React.useState(false);
  const [pendingUpload, setPendingUpload] = React.useState<UploadedRawMedia | null>(null);
  const [previewItem, setPreviewItem] = React.useState<InfluencerPortfolioItemRead | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  React.useEffect(() => {
    getInfluencerMe()
      .then((meData) => {
        setMe(meData);
        setItems(meData.profile?.portfolioItems ?? []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, []);

  async function persist(nextItems: InfluencerPortfolioItemInput[]) {
    if (!me?.profile) return;
    const payload: InfluencerSelfProfileInput = {
      tagline: me.profile.tagline ?? "",
      bio: me.profile.bio ?? "",
      countryCode: me.profile.countryCode ?? "",
      city: me.profile.city ?? "",
      languages: me.profile.languages,
      categoryIds: me.profile.categories.map((c) => c.id),
      availableForBooking: me.profile.availableForBooking,
      portfolioItems: nextItems,
    };
    const updatedProfile = await updateInfluencerProfile(payload);
    setItems(updatedProfile.portfolioItems);
  }

  async function handleAddSave() {
    if (!pendingUpload) {
      toast.error("Upload a video first.");
      return;
    }
    setSaving(true);
    try {
      const nextItems = [...items.map(itemToInput), { media: toMediaPayload(pendingUpload), isPublic: true }];
      await persist(nextItems);
      toast.success("Video added to your portfolio");
      setAddOpen(false);
      setPendingUpload(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility(id: string) {
    setSaving(true);
    try {
      await persist(items.map((item) => (item.id === id ? { ...itemToInput(item), isPublic: !item.isPublic } : itemToInput(item))));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await persist(items.filter((item) => item.id !== id).map(itemToInput));
      toast.success("Video deleted");
      setConfirmingDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    setSaving(true);
    try {
      await persist(reordered.map(itemToInput));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the new order");
      setItems(items);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const publicCount = items.filter((i) => i.isPublic).length;
  const openAdd = () => {
    setPendingUpload(null);
    setAddOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.25rem)", lineHeight: 0.98 }}>
            Portfolio<span className="text-accent-500">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-body-sm text-neutral-500">
            Showcase videos for brands. Up to 4 public videos appear on your profile at /influencers/{me?.profile?.username}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-3 py-1.5 text-label font-bold uppercase tracking-wider", publicCount >= 4 ? "bg-accent-500/15 text-accent-500" : "bg-neutral-200 text-neutral-600")}>
            {publicCount} of 4 public
          </span>
          <Button onClick={openAdd}>
            <Plus /> Add video
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <SortablePortfolioRow
                  key={item.id}
                  item={item}
                  index={index}
                  saving={saving}
                  confirmingDelete={confirmingDeleteId === item.id}
                  onPreview={() => setPreviewItem(item)}
                  onToggleVisibility={() => handleToggleVisibility(item.id)}
                  onAskDelete={() => setConfirmingDeleteId(item.id)}
                  onCancelDelete={() => setConfirmingDeleteId(null)}
                  onConfirmDelete={() => handleDelete(item.id)}
                />
              ))}
              <button
                type="button"
                onClick={openAdd}
                className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-accent-500 hover:text-heading"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-500">
                  <Plus className="size-6" aria-hidden />
                </span>
                <span className="font-heading text-body font-extrabold tracking-tight">{items.length === 0 ? "Add your first video" : "Add another video"}</span>
                <span className="text-label">Shown on your public profile</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add video dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add portfolio video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <VideoUploader sign={signProfileMediaUpload} value={pendingUpload} onChange={setPendingUpload} />
            <div className="flex items-center gap-2.5">
              <Switch checked disabled />
              <Label className="mb-0 text-neutral-400">Public by default — toggle visibility from the list after adding</Label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSave} disabled={saving || !pendingUpload}>
              {saving ? "Saving…" : "Add to portfolio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="size-4" /> Preview
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- arbitrary influencer-uploaded video, no caption track exists to reference
            <video src={previewItem.media.url} controls autoPlay className="max-h-[70vh] w-full rounded-xl bg-black" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
