import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { legalPageContentSchema, type SeoMetaInput } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const legalRouter = Router();

const seoInclude = { seo: { include: { ogImage: true, twitterImage: true } } };

// Privacy Policy and Terms & Conditions are identical in shape (own row +
// a `seo` relation, same draft/publish fields), so both sets of routes are
// generated from one factory instead of writing the same four handlers
// twice. The two Prisma delegates are structurally identical but not the
// same generated TS type, hence the `any` here -- everything downstream of
// it (seoData, Prisma.SeoMeta*Input) stays properly typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegalDelegate = any;

async function applySeo(delegate: LegalDelegate, item: { id: string; seoId: string | null }, seo: Partial<SeoMetaInput>) {
  // Same reasoning as pages.routes.ts (Home/About): seo is a nested
  // relation updated via its scalar seoId FK rather than a nested write,
  // and structuredData is dropped because Prisma rejects a bare `null` for
  // a nullable Json column (it round-trips untouched from GET otherwise).
  const { structuredData: _structuredData, ...seoData } = seo;
  if (item.seoId) {
    await prisma.seoMeta.update({ where: { id: item.seoId }, data: seoData as Prisma.SeoMetaUpdateInput });
  } else if (seoData.metaTitle && seoData.metaDescription) {
    const seoRecord = await prisma.seoMeta.create({ data: seoData as Prisma.SeoMetaCreateInput });
    await delegate.update({ where: { id: item.id }, data: { seoId: seoRecord.id } });
  }
}

function registerLegalPageRoutes(path: string, delegate: LegalDelegate) {
  // Public: only ever serves the last PUBLISHED snapshot (`content`), never
  // the working draft. `null` means the page has never been published --
  // the frontend falls back gracefully, same as every other content type.
  legalRouter.get(
    path,
    asyncHandler(async (_req, res) => {
      const item = await delegate.findFirst({ include: seoInclude });
      if (!item || item.status !== "PUBLISHED") {
        res.json({ item: null });
        return;
      }
      res.json({ item: { title: item.title, content: item.content, lastUpdatedAt: item.lastUpdatedAt, seo: item.seo } });
    }),
  );

  // Admin: full row (including the unpublished draftContent/status) so the
  // editor can resume from wherever editing was last left off.
  legalRouter.get(
    `${path}/admin`,
    requireAuth,
    requirePermission("legal", "view"),
    asyncHandler(async (_req, res) => {
      const item = await delegate.findFirst({ include: seoInclude });
      res.json({ item });
    }),
  );

  // Save Draft: persists into draftContent only. `content`/`status` are
  // untouched, so the public page keeps showing the last published version
  // until Publish is clicked.
  legalRouter.patch(
    path,
    requireAuth,
    requirePermission("legal", "update"),
    asyncHandler(async (req, res) => {
      const { seo, ...data } = legalPageContentSchema.parse(req.body);
      const existing = await delegate.findFirst();
      const contentData = { title: data.title, draftContent: data.content, lastUpdatedAt: data.lastUpdatedAt ?? null };

      const item = existing
        ? await delegate.update({ where: { id: existing.id }, data: contentData })
        : await delegate.create({ data: contentData });

      if (seo) await applySeo(delegate, item, seo);

      const withIncludes = await delegate.findUnique({ where: { id: item.id }, include: seoInclude });
      res.json({ item: withIncludes });
    }),
  );

  // Publish: promotes the submitted content to the live `content` field,
  // clears the pending draft, and flips status to PUBLISHED (one-way --
  // there's no unpublish flow). lastUpdatedAt defaults to now() when left
  // blank, matching the "auto-update supported" requirement.
  legalRouter.post(
    `${path}/publish`,
    requireAuth,
    requirePermission("legal", "update"),
    asyncHandler(async (req, res) => {
      const { seo, ...data } = legalPageContentSchema.parse(req.body);
      const existing = await delegate.findFirst();
      const contentData = {
        title: data.title,
        content: data.content,
        draftContent: null,
        status: "PUBLISHED" as const,
        publishedAt: new Date(),
        lastUpdatedAt: data.lastUpdatedAt ?? new Date(),
      };

      const item = existing
        ? await delegate.update({ where: { id: existing.id }, data: contentData })
        : await delegate.create({ data: contentData });

      if (seo) await applySeo(delegate, item, seo);

      const withIncludes = await delegate.findUnique({ where: { id: item.id }, include: seoInclude });
      res.json({ item: withIncludes });
    }),
  );
}

registerLegalPageRoutes("/privacy-policy", prisma.privacyPolicyContent);
registerLegalPageRoutes("/terms", prisma.termsContent);
