import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const verifyLoginOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type VerifyLoginOtpInput = z.infer<typeof verifyLoginOtpSchema>;

export const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().nullable().optional(),
  permissionIds: z.array(z.string()).default([]),
});
export type RoleInput = z.infer<typeof roleSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  roleId: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
