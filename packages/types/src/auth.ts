import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

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

export const inviteUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  roleId: z.string(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
