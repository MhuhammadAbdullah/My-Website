import { prisma } from "@agency/database";
import { navItemSchema } from "@agency/types";
import { createCrudRouter } from "../lib/create-crud-router.js";

export const navRouter = createCrudRouter({
  resource: "navigation",
  delegate: prisma.navItem,
  schema: navItemSchema,
});
