/**
 * Daftar domain email sementara (disposable/temporary email providers).
 * Dikumpulkan dari penyedia temp-mail paling populer yang sering digunakan bot.
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  // Popular Disposable Email Providers
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "dispostable.com",
  "getnada.com",
  "nada.ltd",
  "sharklasers.com",
  "fakemail.net",
  "fakemailgenerator.com",
  "mohmal.com",
  "throwawaymail.com",
  "maildrop.cc",
  "crazymailing.com",
  "tmail.ws",
  "dayrep.com",
  "teleworm.us",
  "armyspy.com",
  "rhyta.com",
  "jourrapide.com",
  "einrot.com",
  "fleckens.com",
  "gustr.com",
  "superrito.com",
  "boun.cr",
  "celebser.com",
  "tempmailo.com",
  "burnermail.io",
  "emailondeck.com",
  "tmpmail.org",
  "10mail.org",
  "zeroe.ml",
  "mailnesia.com",
  "inboxalias.com",
  "generator.email",
  "inboxkitten.com",
  "dropmail.me",
  "disposablemail.com",
  "tempinbox.com",
  "tempmail.net",
  "mintemail.com",
  "spamgourmet.com",
  "mytemp.email",
  "tempail.com",
  "getairmail.com",
]);

/**
 * Memeriksa apakah sebuah alamat email menggunakan domain email sementara (disposable).
 *
 * @param email Alamat email yang akan diperiksa
 * @returns `true` jika email menggunakan domain sementara, `false` jika tidak.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  if (!domain) {
    return false;
  }

  // Cek exact match domain
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }

  // Cek subdomain (contoh: user@sub.mailinator.com)
  const domainParts = domain.split(".");
  if (domainParts.length > 2) {
    const rootDomain = domainParts.slice(-2).join(".");
    if (DISPOSABLE_EMAIL_DOMAINS.has(rootDomain)) {
      return true;
    }
  }

  return false;
}
