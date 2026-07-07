import { prisma } from "@agency/database";
import { homeStatSchema } from "@agency/types";
import { createCrudRouter } from "../lib/create-crud-router.js";

// Homepage statistics -- a flat, reorderable list like CoreValue/TimelineEvent,
// not nested under HomePageContent (there's only ever one home page row, so a
// parent FK would add nothing). Disabled stats are excluded from the public
// list but still visible/editable in the admin.
export const homeStatsRouter = createCrudRouter({
  resource: "home",
  delegate: prisma.homeStat,
  schema: homeStatSchema,
  publicFindManyArgs: { where: { isEnabled: true } },
  searchFields: ["title"],
  sortableFields: ["title", "order"],
  defaultSort: "order",
});
