"use client";

import * as React from "react";
import { Plus } from "lucide-react";

export interface BenefitAccordionItem {
  title: string;
  description: string;
}

export function BenefitsAccordion({ items }: { items: BenefitAccordionItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={`${item.title}-${index}`} className="group">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full cursor-pointer items-center gap-4 py-5 text-left"
            >
              <span className="flex-1 font-heading text-h4 font-bold text-heading">{item.title}</span>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${isOpen ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-neutral-500 group-hover:border-accent-400"}`}>
                <Plus className={`size-4 transition-transform duration-300 ease-out ${isOpen ? "rotate-45" : "rotate-0"}`} />
              </span>
            </button>
            <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-5 pr-12 text-left text-body-sm leading-relaxed text-neutral-500">{item.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
