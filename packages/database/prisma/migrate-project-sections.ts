import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/client/index.js";

const prisma = new PrismaClient();

// One-off backfill: turns the 10 old hardcoded case-study columns into the
// new dynamic `sections` Json array so existing projects keep their content
// once those columns are dropped. Idempotent -- skips any project that
// already has sections.
const LEGACY_FIELDS: { key: string; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "problem", title: "Client Problem" },
  { key: "research", title: "Research" },
  { key: "strategy", title: "Strategy" },
  { key: "planning", title: "Planning" },
  { key: "wireframesNote", title: "Wireframes" },
  { key: "designNotes", title: "Design" },
  { key: "developmentNotes", title: "Development" },
  { key: "challenges", title: "Challenges" },
  { key: "solutions", title: "Solutions" },
];

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, title: true, sections: true, ...Object.fromEntries(LEGACY_FIELDS.map((f) => [f.key, true])) },
  });

  let migrated = 0;
  let skipped = 0;

  for (const project of projects) {
    const record = project as unknown as Record<string, unknown>;
    const existingSections = Array.isArray(record.sections) ? (record.sections as unknown[]) : [];
    if (existingSections.length > 0) {
      skipped++;
      continue;
    }

    const sections = LEGACY_FIELDS.map(({ key, title }, index) => {
      const value = record[key];
      if (typeof value !== "string" || !value.trim()) return null;
      return { id: randomUUID(), title, content: value.trim(), icon: null, order: index };
    }).filter((section): section is NonNullable<typeof section> => section !== null);

    if (sections.length === 0) {
      skipped++;
      continue;
    }

    await prisma.project.update({ where: { id: project.id }, data: { sections } });
    migrated++;
    console.log(`Migrated "${project.title}" -> ${sections.length} sections`);
  }

  console.log(`\nDone. Migrated ${migrated} project(s), skipped ${skipped} (already had sections or no content).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
