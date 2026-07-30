import { env } from "./env";

/**
 * Parsir string origin dari environment variable (misalnya dipisahkan koma),
 * hapus spasi berlebih, dan otomatis tambahkan varian apex/www agar request dari
 * subdomain www maupun apex (mis. https://dilirik.tech & https://www.dilirik.tech)
 * sama-sama dipercayai oleh CORS dan Better Auth CSRF check.
 */
export function parseOrigins(...inputs: (string | string[] | undefined)[]): string[] {
  const set = new Set<string>();

  for (const input of inputs.flat()) {
    if (!input) continue;
    const parts = input.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      set.add(trimmed);

      try {
        const url = new URL(trimmed);
        if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
          if (url.hostname.startsWith("www.")) {
            const apex = url.hostname.replace(/^www\./i, "");
            set.add(`${url.protocol}//${apex}${url.port ? ":" + url.port : ""}`);
          } else {
            set.add(`${url.protocol}//www.${url.hostname}${url.port ? ":" + url.port : ""}`);
          }
        }
      } catch {
        // Abaikan jika bukan string URL valid
      }
    }
  }

  return Array.from(set);
}

/**
 * Mendapatkan daftar lengkap allowed/trusted origins gabungan dari
 * `CORS_ORIGIN` dan `NEXT_PUBLIC_APP_URL`.
 */
export const getAllowedOrigins = (): string[] =>
  parseOrigins(env.CORS_ORIGIN, env.NEXT_PUBLIC_APP_URL);
