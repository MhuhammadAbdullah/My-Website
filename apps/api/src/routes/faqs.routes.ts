import { prisma } from "@agency/database";
import { faqSchema } from "@agency/types";
import { createCrudRouter } from "../lib/create-crud-router.js";

export const faqsRouter = createCrudRouter({
  resource: "faqs",
  delegate: prisma.faq,
  schema: faqSchema,
  publicFindManyArgs: { where: { status: "PUBLISHED" } },
  searchFields: ["question", "answer"],
  sortableFields: ["question", "context", "status", "order", "createdAt", "updatedAt"],
  defaultSort: "order",
  filterFields: ["context", "status"],
});
