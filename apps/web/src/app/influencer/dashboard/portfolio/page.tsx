"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, FileVideo, GripVertical, Play, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, Label, Skeleton, Switch, toast } from "@agency/ui";
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
  onPreview,
  onToggleVisibility,
  onDelete,
}: {
  item: InfluencerPortfolioItemRead;
  index: number;
  onPreview: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-background p-4">
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-neutral-400 hover:text-heading" aria-label="Drag to reorder">
        <GripVertical className="size-4" />
      </button>

      <button type="button" onClick={onPreview} className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        <FileVideo className="size-6 text-neutral-400" />
      </button>

      <div className="min-w-[10rem] flex-1 basis-40">
        <p className="font-medium text-heading">Video {index + 1}</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={onToggleVisibility}>
          <Badge variant={item.isPublic ? "success" : "neutral"} className="gap-1">
            {item.isPublic ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            {item.isPublic ? "Public" : "Hidden"}
          </Badge>
        </button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="size-4 text-error-500" />
        </Button>
      </div>
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Portfolio</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Upload showcase videos — up to 4 public videos appear on your profile at /influencers/{me?.profile?.username}.
          </p>
        </div>
        <Button
          onClick={() => {
            setPendingUpload(null);
            setAddOpen(true);
          }}
        >
          <Plus /> Add video
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            No portfolio videos yet. Add your first one to start building your public showcase.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <div key={item.id}>
                  <SortablePortfolioRow
                    item={item}
                    index={index}
                    onPreview={() => setPreviewItem(item)}
                    onToggleVisibility={() => handleToggleVisibility(item.id)}
                    onDelete={() => setConfirmingDeleteId(item.id)}
                  />
                  {confirmingDeleteId === item.id && (
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-error-200 bg-error-50 px-4 py-3">
                      <p className="text-body-sm text-error-600">Delete this video? This can't be undone.</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmingDeleteId(null)}>
                          Cancel
                        </Button>
                        <Button variant="outline" size="sm" disabled={saving} onClick={() => handleDelete(item.id)}>
                          Confirm delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
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
