import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@dilirik/db";
import { DEFAULT_ANALYSIS_QUOTA } from "@dilirik/shared";
import { env } from "./env";
import { sendResetPasswordEmail, sendVerificationEmail } from "./mailer";

/**
 * Better Auth (PRD §7.1): email/password + OAuth Google & GitHub.
 * Field kuota (analysisQuota dsb) ada di skema Prisma dgn default —
 * quotaResetAt diisi saat analisis pertama (lihat services/quota.ts).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CORS_ORIGIN, env.NEXT_PUBLIC_APP_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
      await sendVerificationEmail(user.email, verifyUrl);
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? "",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  user: {
    additionalFields: {
      plan: { type: "string", defaultValue: "free" },
      analysisQuota: {
        type: "number",
        defaultValue: DEFAULT_ANALYSIS_QUOTA,
        required: false,
      },
      analysisUsedThisPeriod: { type: "number", defaultValue: 0 },
      uiLanguage: { type: "string", defaultValue: "id", required: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
