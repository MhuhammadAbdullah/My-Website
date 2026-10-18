"use client";

import { Heading } from "@agency/ui";
import { MediaLibrary } from "@/components/cms/media-library";

export default function MediaPage() {
  return (
    <div>
      <Heading level={2}>Media library</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Every image used on the site. Add alt text (needed for accessibility and SEO), set a focal point, or replace a file everywhere it is used.
      </p>
      <div className="mt-6">
        <MediaLibrary />
      </div>
    </div>
  );
}
