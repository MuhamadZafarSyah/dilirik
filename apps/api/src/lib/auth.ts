import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@dilirik/db";
import { DEFAULT_ANALYSIS_QUOTA } from "@dilirik/shared";
import { env } from "./env";
import { getAllowedOrigins } from "./origins";
import { sendResetPasswordEmail, sendVerificationEmail } from "./mailer";

function getCookieDomain(): string | undefined {
  if (env.NODE_ENV !== "production") return undefined;
  try {
    const hostname = new URL(env.NEXT_PUBLIC_APP_URL).hostname.replace(/^www\./i, "");
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
    return hostname.startsWith(".") ? hostname : `.${hostname}`;
  } catch {
    return ".dilirik.tech";
  }
}

/**
 * Better Auth (PRD §7.1): email/password + OAuth Google & GitHub.
 * Field kuota (analysisQuota dsb) ada di skema Prisma dgn default —
 * quotaResetAt diisi saat analisis pertama (lihat services/quota.ts).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getAllowedOrigins(),
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: getCookieDomain(),
    },
  },
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
