import { prisma } from "@agency/database";
import { z } from "zod";
import { createCrudRouter } from "../lib/create-crud-router.js";

const coreValueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  order: z.number().int().default(0),
});

const timelineEventSchema = z.object({
  year: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  order: z.number().int().default(0),
});

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  year: z.string().min(1),
  url: z.string().url().nullable().optional(),
  order: z.number().int().default(0),
});

export const coreValuesRouter = createCrudRouter({
  resource: "about",
  delegate: prisma.coreValue,
  schema: coreValueSchema,
});

export const timelineEventsRouter = createCrudRouter({
  resource: "about",
  delegate: prisma.timelineEvent,
  schema: timelineEventSchema,
});

export const certificationsRouter = createCrudRouter({
  resource: "about",
  delegate: prisma.certification,
  schema: certificationSchema,
});
