import { prisma } from "@agency/database";

// Persisted in-app notification (bell icon, both admin and influencer
// dashboards). Route handlers call this alongside the matching
// influencer-mailer.ts function for the same event -- kept as two separate
// calls rather than one wrapper, since each email needs bespoke content the
// notification row doesn't (title/body here are short, list-view strings).
export async function notifyStaffByPermission(resource: string, action: string, data: { type: string; title: string; body: string; linkUrl?: string }) {
  const staff = await prisma.user.findMany({
    where: { role: { permissions: { some: { permission: { resource, action } } } } },
    select: { id: true },
  });
  if (staff.length === 0) return;
  await prisma.notification.createMany({
    data: staff.map((u) => ({
      recipientType: "STAFF" as const,
      recipientUserId: u.id,
      type: data.type,
      title: data.title,
      body: data.body,
      linkUrl: data.linkUrl,
    })),
  });
}

export async function notifyInfluencer(influencerId: string, data: { type: string; title: string; body: string; linkUrl?: string }) {
  await prisma.notification.create({
    data: {
      recipientType: "INFLUENCER",
      recipientInfluencerId: influencerId,
      type: data.type,
      title: data.title,
      body: data.body,
      linkUrl: data.linkUrl,
    },
  });
}
