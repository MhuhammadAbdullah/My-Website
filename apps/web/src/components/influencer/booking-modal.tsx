"use client";

import * as React from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@agency/ui";
import { BookingForm } from "./booking-form";
import type { InfluencerPricingCardRead } from "@/lib/influencer-types";

export function BookingModal({
  username,
  influencerName,
  pricingCards,
}: {
  username: string;
  influencerName: string;
  pricingCards: InfluencerPricingCardRead[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        Book this influencer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book {influencerName}</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-neutral-600">Tell us about your campaign and our team will follow up with next steps.</p>
          <div className="mt-6">
            <BookingForm username={username} pricingCards={pricingCards} bare />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
