"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Input,
  Label,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from "@agency/ui";
import { influencerSelfProfileSchema, type InfluencerPricingCardInput, type InfluencerSelfProfileInput } from "@agency/types";
import { getInfluencerMe, getPricingLimits, updateInfluencerProfile } from "@/lib/influencer-api";
import type { InfluencerMeRead, InfluencerPricingCardRead } from "@/lib/influencer-types";

type BaseFields = Omit<InfluencerSelfProfileInput, "platforms" | "portfolioItems" | "pricingItems" | "pricingCards">;

function baseFieldsFrom(me: InfluencerMeRead): BaseFields {
  const p = me.profile!;
  return {
    tagline: p.tagline ?? "",
    bio: p.bio ?? "",
    countryCode: p.countryCode ?? "",
    city: p.city ?? "",
    languages: p.languages,
    categoryIds: p.categories.map((c) => c.id),
    availableForBooking: p.availableForBooking,
    profilePhoto: null,
    coverImage: null,
  };
}

export default function InfluencerPricingPage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [maxCards, setMaxCards] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    return Promise.all([getInfluencerMe(), getPricingLimits()]).then(([meData, limits]) => {
      setMe(meData);
      setMaxCards(limits.maxPricingCards);
    });
  }, []);

  React.useEffect(() => {
    load()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load pricing"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading || !me?.profile || maxCards === null) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full max-w-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2}>Pricing</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Showcase packages on your public profile — clients pick one when booking you.
      </p>

      <PricingCards me={me} maxCards={maxCards} onSaved={load} />
    </div>
  );
}

const EMPTY_CARD: InfluencerPricingCardInput = {
  title: "",
  price: 0,
  currency: "",
  estimatedDeliveryTime: "",
  description: "",
  features: [],
  isCustomQuote: false,
  isEnabled: true,
};

function cardToInput(card: InfluencerPricingCardRead): InfluencerPricingCardInput {
  return {
    title: card.title,
    price: card.price ? Number(card.price) : undefined,
    currency: card.currency ?? "",
    estimatedDeliveryTime: card.estimatedDeliveryTime ?? "",
    description: card.description ?? "",
    features: card.features,
    isCustomQuote: card.isCustomQuote,
    isEnabled: card.isEnabled,
  };
}

// Showcase "package" cards (brief §15) -- what a client now books against
// directly from the public booking form's Package dropdown.
function PricingCards({ me, maxCards, onSaved }: { me: InfluencerMeRead; maxCards: number; onSaved: () => Promise<void> }) {
  const [cards, setCards] = React.useState<InfluencerPricingCardRead[]>(me.profile!.pricingCards);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<InfluencerPricingCardInput>(EMPTY_CARD);
  const [featuresText, setFeaturesText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setCards(me.profile!.pricingCards);
  }, [me]);

  function openCreate() {
    setDraft(EMPTY_CARD);
    setFeaturesText("");
    setEditingIndex(-1);
  }

  function openEdit(i: number) {
    const input = cardToInput(cards[i]!);
    setDraft(input);
    setFeaturesText(input.features.join("\n"));
    setEditingIndex(i);
  }

  async function persist(nextCards: InfluencerPricingCardInput[]) {
    const payload: InfluencerSelfProfileInput = { ...baseFieldsFrom(me), pricingCards: nextCards };
    const parsed = influencerSelfProfileSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return false;
    }
    setSaving(true);
    try {
      await updateInfluencerProfile(parsed.data);
      await onSaved();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!draft.isCustomQuote && (!draft.price || draft.price <= 0)) {
      toast.error("Enter a price greater than 0.");
      return;
    }
    const finalized: InfluencerPricingCardInput = {
      ...draft,
      price: draft.isCustomQuote ? undefined : draft.price,
      features: featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    const current = cards.map(cardToInput);
    const next = editingIndex === -1 ? [...current, finalized] : current.map((c, i) => (i === editingIndex ? finalized : c));
    if (next.length > maxCards) {
      toast.error(`You can have at most ${maxCards} pricing cards.`);
      return;
    }
    const ok = await persist(next);
    if (ok) {
      toast.success(editingIndex === -1 ? "Pricing card added" : "Pricing card updated");
      setEditingIndex(null);
    }
  }

  async function handleDelete(i: number) {
    const next = cards.filter((_, idx) => idx !== i).map(cardToInput);
    const ok = await persist(next);
    if (ok) toast.success("Pricing card removed");
  }

  async function handleToggleEnabled(i: number) {
    const next = cards.map((c, idx) => (idx === i ? { ...cardToInput(c), isEnabled: !c.isEnabled } : cardToInput(c)));
    await persist(next);
  }

  const atLimit = cards.length >= maxCards;

  return (
    <div className="mt-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body-sm font-semibold text-heading">Pricing cards</h3>
          <p className="mt-1 text-body-sm text-neutral-500">
            Showcase packages (e.g. Instagram Reel, TikTok Video) — clients pick one when booking you. {cards.length}/{maxCards} used.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate} disabled={atLimit}>
          Add card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
          No pricing cards yet — add one so clients can book you.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => (
            <div key={card.id} className="rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-heading">{card.title}</p>
                  <p className="text-h4 font-semibold text-heading">
                    {card.isCustomQuote ? "Custom Quote" : `${card.currency ? `${card.currency} ` : ""}${Number(card.price).toLocaleString()}`}
                  </p>
                  {card.estimatedDeliveryTime && <p className="text-label text-neutral-400">{card.estimatedDeliveryTime}</p>}
                </div>
                <Badge variant={card.isEnabled ? "success" : "neutral"}>{card.isEnabled ? "Live" : "Hidden"}</Badge>
              </div>
              {card.description && <p className="mt-2 text-body-sm text-neutral-600">{card.description}</p>}
              {card.features.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {card.features.map((f, fi) => (
                    <li key={fi} className="text-body-sm text-neutral-600">
                      • {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-2">
                  <Switch checked={card.isEnabled} onCheckedChange={() => handleToggleEnabled(i)} disabled={saving} />
                  <span className="text-label text-neutral-400">Visible</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(i)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIndex === -1 ? "New pricing card" : "Edit pricing card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input placeholder="Instagram Reel" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isCustomQuote}
                onCheckedChange={(v) => setDraft({ ...draft, isCustomQuote: v, price: v ? undefined : draft.price })}
              />
              <Label className="font-normal">Custom quote (no fixed price — you'll negotiate the amount)</Label>
            </div>
            {!draft.isCustomQuote && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={draft.price || ""}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Currency (optional)</Label>
                  <Input placeholder="USD" value={draft.currency ?? ""} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
                </div>
              </div>
            )}
            <div>
              <Label>Estimated delivery time</Label>
              <Input
                placeholder="24 Hour Delivery"
                value={draft.estimatedDeliveryTime ?? ""}
                onChange={(e) => setDraft({ ...draft, estimatedDeliveryTime: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                placeholder={"1 Reel\n1 Story\n1 Feed Post\nCommercial Usage"}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.isEnabled} onCheckedChange={(v) => setDraft({ ...draft, isEnabled: v })} />
              <Label className="font-normal">Visible on public profile</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingIndex(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save card"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
