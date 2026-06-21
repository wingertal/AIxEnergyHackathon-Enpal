// Client-safe formatting helpers (no server-only imports).

export function kw(n: number): string {
  return `${n.toFixed(n < 10 ? 2 : 1)} kW`;
}

export function kwh(n: number): string {
  return `${n.toFixed(n < 10 ? 1 : 0)} kWh`;
}

export function eur(n: number, dp = 2): string {
  return `€${n.toFixed(dp)}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function priceCents(eurPerKwh: number): string {
  return `${(eurPerKwh * 100).toFixed(1)}c/kWh`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
}
