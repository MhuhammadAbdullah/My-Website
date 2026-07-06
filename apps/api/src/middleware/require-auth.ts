import type { NextFunction, Request, Response } from "express";
import { auth } from "@agency/auth/server";
import { prisma } from "@agency/database";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleId: string | null;
        permissions: Set<string>;
      };
    }
  }
}

function toNodeHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  return headers;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: toNodeHeaders(req) });

  if (!session?.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!dbUser || dbUser.banned) {
    res.status(403).json({ error: "Account is not permitted to access the admin panel" });
    return;
  }

  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    roleId: dbUser.roleId,
    permissions: new Set(
      dbUser.role?.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`) ?? [],
    ),
  };

  next();
}

export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions.has(`${resource}:${action}`)) {
      res.status(403).json({ error: `Missing permission ${resource}:${action}` });
      return;
    }
    next();
  };
}

// For endpoints usable from both create and edit flows (e.g. a media upload
// signer), where either permission should be enough to proceed.
export function requireAnyPermission(...checks: [resource: string, action: string][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const allowed = checks.some(([resource, action]) => req.user?.permissions.has(`${resource}:${action}`));
    if (!allowed) {
      res.status(403).json({ error: `Missing permission ${checks.map(([r, a]) => `${r}:${a}`).join(" or ")}` });
      return;
    }
    next();
  };
}
