import { z } from "zod";

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const passwordResetSchema = z.object({
  email: z.string().email(),
});
