export function formatRs(amount: number): string {
  return `Rs ${amount}`;
}

function dayWithOrdinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatSessionHeader(playDate: string, totalAmount: number): string {
  const d = parseLocalDate(playDate);
  const day = dayWithOrdinal(d.getDate());
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year} · ${formatRs(totalAmount)}`;
}

/** Parse YYYY-MM-DD as local date (avoid UTC shift). */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function splitAmount(total: number, playerCount: number): number {
  if (playerCount <= 0) return 0;
  return Math.ceil(total / playerCount);
}