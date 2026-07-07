import { prisma } from "@agency/database";
import { homeProcessStepSchema, homeWhyReasonSchema } from "@agency/types";
import { createCrudRouter } from "../lib/create-crud-router.js";

// "How we work" and "Why work with us" -- flat, reorderable lists (like
// CoreValue/TimelineEvent), each rendered as its own homepage section.
// Disabled cards are excluded from the public list but stay visible/editable
// in the admin.
export const homeProcessStepsRouter = createCrudRouter({
  resource: "home",
  delegate: prisma.homeProcessStep,
  schema: homeProcessStepSchema,
  publicFindManyArgs: { where: { isEnabled: true } },
  searchFields: ["title"],
  sortableFields: ["title", "order"],
  defaultSort: "order",
});

export const homeWhyReasonsRouter = createCrudRouter({
  resource: "home",
  delegate: prisma.homeWhyReason,
  schema: homeWhyReasonSchema,
  publicFindManyArgs: { where: { isEnabled: true } },
  searchFields: ["title"],
  sortableFields: ["title", "order"],
  defaultSort: "order",
});
