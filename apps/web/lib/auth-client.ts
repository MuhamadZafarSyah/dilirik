import { createAuthClient } from "better-auth/react"

/** Better Auth client — menunjuk ke API Express (PRD §7.1). */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
})

export const { signIn, signUp, signOut, useSession } = authClient
