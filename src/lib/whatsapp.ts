import { formatRs, parseLocalDate } from "@/lib/utils";

/** Digits only for wa.me; null if too short/long. */
export function phoneToWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Optional phone from form: empty → null; invalid → error. */
export function parseOptionalPhone(
  raw: string
): { ok: true; phone: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, phone: null };
  if (!phoneToWhatsAppDigits(trimmed)) {
    return {
      ok: false,
      error: "Phone must include country code (10–15 digits), e.g. +923214928856.",
    };
  }
  return { ok: true, phone: trimmed };
}

export function formatPlayDateForMessage(playDate: string): string {
  const d = parseLocalDate(playDate);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function resolveAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function buildDueWhatsAppMessage(opts: {
  playerName: string;
  playDate: string;
  amount: number;
  appUrl: string;
}): string {
  const dateLabel = formatPlayDateForMessage(opts.playDate);
  return (
    `Hi ${opts.playerName},\n\n` +
    `New cricket dues for ${dateLabel}:\n` +
    `Amount due: ${formatRs(opts.amount)}\n\n` +
    `View details: ${opts.appUrl}/`
  );
}

export function buildWhatsAppUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}
