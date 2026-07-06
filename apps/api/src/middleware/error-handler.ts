import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@agency/database";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Not found", path: req.path });
}

function summarizeZodError(error: ZodError): string {
  const { fieldErrors, formErrors } = error.flatten();
  const fieldMessages = Object.entries(fieldErrors)
    .filter(([, messages]) => messages && messages.length > 0)
    .map(([field, messages]) => `${field}: ${messages![0]}`);
  const messages = [...formErrors, ...fieldMessages];
  return messages.length ? `Validation failed — ${messages.join("; ")}` : "Validation failed";
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    console.error("Validation error on", req.method, req.path, err.flatten());
    res.status(422).json({ error: summarizeZodError(err), issues: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with that value already exists" });
      return;
    }
  }

  // Malformed query args (e.g. a field the schema doesn't recognize) — a bug
  // in our own Prisma calls, not the caller's fault, but still not a 500: the
  // request itself was well-formed, our handling of it wasn't.
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error on", req.method, req.path, err.message);
    res.status(400).json({ error: "The request could not be processed due to an internal data error" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
