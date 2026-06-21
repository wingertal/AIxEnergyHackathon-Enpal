// Client-safe formatting helpers (no server-only imports).

export function eur(n: number, dp = 2): string {
  return `€${n.toFixed(dp)}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
}
