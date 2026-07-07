import { prisma } from "@agency/database";
import { skillSchema } from "@agency/types";
import { createCrudRouter } from "../lib/create-crud-router.js";

// Skills are global (shared across team members via the many-to-many
// relation, not per-member proficiency), so they're a flat, reorderable list
// like CoreValue -- managed from the About page's Skills tab. Disabled
// skills are excluded from the public list (About page progress bars) but
// stay visible in the admin (e.g. team-member skill assignment).
export const skillsRouter = createCrudRouter({
  resource: "team",
  delegate: prisma.skill,
  schema: skillSchema,
  publicFindManyArgs: { where: { isEnabled: true } },
  searchFields: ["name"],
  sortableFields: ["name", "order"],
  defaultSort: "order",
});
