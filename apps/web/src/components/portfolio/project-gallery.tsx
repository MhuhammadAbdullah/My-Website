"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cloudinaryTransform } from "@/lib/cloudinary";
import type { ProjectImageRead } from "@/lib/types";

export function ProjectGallery({ images, title }: { images: ProjectImageRead[]; title: string }) {
  const [index, setIndex] = React.useState(0);

  if (images.length === 0) return null;

  const current = images[index]!;
  const hasMultiple = images.length > 1;

  function go(delta: number) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div
      className="w-full"
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${title} gallery`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-100">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Image
              src={cloudinaryTransform(current.url, "f_auto,q_auto,w_1600")}
              alt={current.caption ?? title}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="(min-width: 1024px) 66vw, 100vw"
            />
          </motion.div>
        </AnimatePresence>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="mt-4 flex justify-center gap-2">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-heading" : "w-2 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
