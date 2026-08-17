import { z } from "zod"
import { isDisposableEmail } from "../utils/disposableEmail"

export const registerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  email: z
    .string()
    .email("Email tidak valid")
    .refine((val) => !isDisposableEmail(val), {
      message: "Email sementara (disposable email) tidak diperbolehkan.",
    }),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
