import type { SkyIcon } from "@/lib/weather";

export function Bolt({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

export function Leaf() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5-3.5 8.5-9 8.5" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

export function Back() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function PiggyBank({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 9a4 4 0 0 0-4-4H9a5 5 0 0 0-5 5 4 4 0 0 0 2 3.5V17h2.5l.5 1.5h3L13 17h2v-2a4 4 0 0 0 2-1l2 .5V10z" />
      <path d="M12 5V4M16 9h.01" />
    </svg>
  );
}

export function Send() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}

export function Sky({ icon, size = 26 }: { icon: SkyIcon; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const };
  switch (icon) {
    case "sun":
      return (
        <svg {...p} stroke="var(--solar)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M18.4 5.6l-.7.7M6.3 17.7l-.7.7" />
        </svg>
      );
    case "partly":
      return (
        <svg {...p} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3" stroke="var(--solar)" />
          <path d="M8 2v1M2 8h1M3.8 3.8l.7.7" stroke="var(--solar)" />
          <path d="M17 18H8a4 4 0 0 1 .5-8 5 5 0 0 1 9 2 3.5 3.5 0 0 1-.5 6z" stroke="var(--grid)" fill="white" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...p} stroke="var(--grid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 18H7a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 18z" fill="white" />
        </svg>
      );
    case "rain":
      return (
        <svg {...p} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 14H7a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 14z" stroke="var(--grid)" fill="white" />
          <path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="var(--grid)" />
        </svg>
      );
  }
}

export function UnitIcon({ unit, className }: { unit: string; className?: string }) {
  const p = { className, width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (unit) {
    case "solar":
      return (
        <svg {...p}>
          <rect x="3" y="13" width="18" height="8" rx="1" />
          <path d="M5 13l1-4h12l1 4M9 9v4M15 9v4M3 17h18" />
          <path d="M12 3v3M7 5l1 1.5M17 5l-1 1.5" />
        </svg>
      );
    case "battery":
    case "battery_suggestion":
      return (
        <svg {...p}>
          <rect x="3" y="7" width="16" height="10" rx="2" />
          <path d="M21 11v2" />
          <path d="M12 9l-1.5 2.5H13L11.5 15" />
        </svg>
      );
    case "heatpump":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 8.5v7M8.5 12h7" />
        </svg>
      );
    case "ev":
      return (
        <svg {...p}>
          <path d="M5 17h11M5 17a2 2 0 0 1-2-2v-3l2-4h9l2 4v5a2 2 0 0 1-2 0" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="14.5" cy="17.5" r="1.5" />
          <path d="M19 11l2 1v3a1.5 1.5 0 0 1-3 0v-2" />
        </svg>
      );
    case "grid":
      return (
        <svg {...p}>
          <path d="M9 3 7 9h4l-2 6M15 3l-2 6h4l-2 6M5 21l4-9M19 21l-4-9M9 12h6" />
        </svg>
      );
    case "household":
      return (
        <svg {...p}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    default:
      return null;
  }
}

export function RecGlyph({ icon, className }: { icon: string; className?: string }) {
  const p = { className, width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "ev":
    case "heatpump":
    case "battery":
      return <UnitIcon unit={icon} className={className} />;
    case "sun":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      );
    case "tariff":
      return (
        <svg {...p}>
          <path d="M20.6 13.4 13 21l-9-9V4h8z" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "alert":
      return (
        <svg {...p}>
          <path d="M12 3 2 20h20z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      );
    case "bolt":
    default:
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
        </svg>
      );
  }
}

export const REC_TONE = {
  good: { color: "var(--battery)", soft: "var(--battery-soft)" },
  warn: { color: "var(--danger)", soft: "#fae3e2" },
  info: { color: "var(--slate)", soft: "var(--sky)" },
} as const;

export const CONDITION_COLORS = {
  green: { color: "var(--battery)", soft: "var(--battery-soft)" },
  amber: { color: "var(--solar)", soft: "var(--solar-soft)" },
  grey: { color: "var(--muted)", soft: "var(--background)" },
} as const;

export const LIGHT_COLORS = {
  green: { color: "var(--battery)", soft: "var(--battery-soft)", label: "Good" },
  yellow: { color: "var(--solar)", soft: "var(--solar-soft)", label: "Okay" },
  red: { color: "var(--danger)", soft: "#fae3e2", label: "Wait" },
} as const;

// Overall energy-health states (great / warning / high alert).
export const HEALTH_COLORS = {
  great: { color: "var(--battery)", soft: "var(--battery-soft)" },
  warning: { color: "var(--solar)", soft: "var(--solar-soft)" },
  alert: { color: "var(--danger)", soft: "#fae3e2" },
} as const;

export function HealthGlyph({ level }: { level: "great" | "warning" | "alert" }) {
  if (level === "great") {
    // check-in-circle
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    );
  }
  // warning / alert triangle
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
