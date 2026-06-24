"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppData } from "./AppShell";
import type {
  TrafficStatus,
  EnergyHealth,
  MonthSummary,
  MonthToDate,
  BillComparison,
  EquipmentUnit,
  Recommendation,
  PriceWindow,
} from "@/lib/data";
import type { WeatherOutlook } from "@/lib/weather";
import type { Snapshot } from "@/lib/types";
import { eur } from "@/lib/format";
import {
  Sky,
  UnitIcon,
  RecGlyph,
  HealthGlyph,

  Send,
  REC_TONE,
  LIGHT_COLORS,
  HEALTH_COLORS,
  CONDITION_COLORS,
  DEVICE_COLORS,
} from "./icons";
import { AskScreen } from "./AskScreen";

const SOURCE_COLOR: Record<string, string> = {
  solar: "var(--solar)",
  battery: "var(--battery)",
  grid: "var(--grid)",
};

function shortName(name: string): string {
  return name.replace("Familie ", "").replace("WG ", "");
}

/* =============================================================== web shell */

export function WebShell({ data }: { data: AppData }) {
  const router = useRouter();
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar
        data={data}
        onSwitch={(id) => router.push(`/?hh=${id}`)}
        onAsk={() => setAskOpen(true)}
      />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-8 pb-16 pt-6 md:pt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* main column ------------------------------------------------ */}
          <div className="space-y-6 lg:col-span-2">
            <StatusPanel
              health={data.health}
              status={data.status}
              windows={data.windows}
            />
            <SavingsPanel
              month={data.month}
              mtd={data.monthToDate}
              comparison={data.billComparison}
              label={data.monthLabel}
            />
            <EquipmentPanel units={data.equipment} />
            <RecommendationsPanel recs={data.recommendations} />
          </div>

          {/* side column ------------------------------------------------ */}
          <div className="space-y-6">
            <EnergyFlowCard live={data.live} household={data.household} />
            <TrendPanel trend={data.trend} currentMonth={data.month.month} />
            <WeatherPanel weather={data.weather} />
            <AskCard
              questions={data.questions}
              onAsk={() => setAskOpen(true)}
            />
          </div>
        </div>
      </main>

      {askOpen && (
        <AskDrawer
          householdId={data.household.id}
          questions={data.questions}
          onClose={() => setAskOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ top bar */

function TopBar({
  data,
  onSwitch,
  onAsk,
}: {
  data: AppData;
  onSwitch: (id: string) => void;
  onAsk: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 md:gap-5 px-4 sm:px-6 md:px-8 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold tracking-tight text-[var(--navy)]">
            Enpal<span className="text-[var(--gold)]">.</span>
          </span>
          <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--navy)]">
            Coach
          </span>
        </div>


        <div className="ml-auto flex items-center gap-3">
          <select
            value={data.household.id}
            onChange={(e) => onSwitch(e.target.value)}
            className="rounded-full border bg-white px-3.5 py-2 text-[12.5px] font-medium text-[var(--home)] outline-none"
            aria-label="Switch household"
          >
            {data.households.map((h) => (
              <option key={h.id} value={h.id}>
                {shortName(h.name)} · {h.city}
              </option>
            ))}
          </select>
          <button
            onClick={onAsk}
            className="rounded-full bg-[var(--home)] px-4 py-2 text-[15px] font-medium text-white transition hover:opacity-90"
          >
            <span className="lg:hidden">Ask</span>
            <span className="hidden lg:inline">Ask your companion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- status */

function StatusPanel({
  health,
  status,
  windows,
}: {
  health: EnergyHealth;
  status: TrafficStatus;
  windows: PriceWindow[];
}) {
  const c = HEALTH_COLORS[health.level];
  const onOwnPower = (status.mix.sources.find((s) => s.key === "grid")?.pct ?? 0) < 15;
  return (
    <section>
      <p className="eyebrow mb-3">Energy status</p>
      <div className="card card-arc-border p-6" style={{ '--arc-c': c.color } as React.CSSProperties}>
        {/* Header row — matches mobile LightStrip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="live-dot inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
            <h2 className="text-[18px] font-semibold text-[var(--home)]">{health.title}</h2>
          </div>
          <span className="rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold" style={{ background: c.soft, color: c.color }}>
            {health.badge}
          </span>
        </div>

        {/* Three metrics — same fields as mobile */}
        <div className="mt-4 grid grid-cols-3 divide-x border-t pt-4">
          <div className="pr-4">
            <p className="eyebrow mb-1">Self-powered</p>
            <p className="text-[20px] font-semibold text-[var(--home)] tabular">{health.self_sufficiency_pct}%</p>
          </div>
          <div className="px-4">
            <p className="eyebrow mb-1">Using now</p>
            <p className="text-[20px] font-semibold text-[var(--home)] tabular">{status.house_load_kw.toFixed(1)} kW</p>
          </div>
          <div className="pl-4">
            <p className="eyebrow mb-1">Power cost</p>
            <p className="text-[20px] font-semibold tabular" style={{ color: onOwnPower ? "var(--battery)" : "var(--home)" }}>
              {onOwnPower ? "Free" : `${status.price_cents}c`}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ------------------------------------------------------- recommendations */

function RecommendationsPanel({ recs }: { recs: Recommendation[] }) {
  if (!recs.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[18px] font-semibold text-[var(--navy)]">
          Your energy coach
        </h3>
        <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[12.5px] font-semibold text-[var(--navy)]">
          {recs.length} tips
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {recs.map((r) => (
          <RecCard key={r.id} rec={r} />
        ))}
      </div>
    </section>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const t = REC_TONE[rec.tone];
  return (
    <div
      className="card flex h-full flex-col p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: t.soft, color: t.color }}
        >
          <RecGlyph icon={rec.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[15px] font-semibold leading-snug text-[var(--navy)]">
              {rec.title}
            </h4>
            {rec.saving && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tabular"
                style={{ background: t.soft, color: t.color }}
              >
                {rec.saving}
              </span>
            )}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--foreground)]">
            {rec.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- equipment */

function EquipmentPanel({ units }: { units: EquipmentUnit[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-[18px] font-semibold text-[var(--home)]">
          Your equipment
        </h3>
        <ConditionLegend />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {units.map((u) => (
          <EquipmentCard key={u.key} unit={u} />
        ))}
      </div>
    </section>
  );
}

function EquipmentCard({ unit }: { unit: EquipmentUnit }) {
  const c = CONDITION_COLORS[unit.condition];
  const d = DEVICE_COLORS[unit.key] ?? { color: "var(--muted)", soft: "var(--background)" };
  return (
    <div className="card card-interactive flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: d.soft, color: d.color }}
        >
          <UnitIcon unit={unit.key} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[18px] font-semibold text-[var(--home)]">
              {unit.name}
            </h4>
            <span
              className="ml-auto inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: c.color }}
              aria-hidden
            />
          </div>
          <p
            className="mt-0.5 text-[15px] font-medium"
            style={{ color: c.color }}
          >
            {unit.status}
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--foreground)]">{unit.why}</p>
    </div>
  );
}

function ConditionLegend() {
  const items: { c: "green" | "amber" | "grey"; label: string }[] = [
    { c: "green", label: "fine" },
    { c: "amber", label: "check" },
    { c: "grey", label: "idle" },
  ];
  return (
    <div className="flex items-center gap-3 text-[12.5px] text-muted">
      {items.map((i) => (
        <span key={i.c} className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: CONDITION_COLORS[i.c].color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- savings */

function SavingsPanel({
  month,
  mtd,
  comparison,
  label,
}: {
  month: MonthSummary;
  mtd: MonthToDate;
  comparison: BillComparison;
  label: string;
}) {
  return (
    <section>
      <p className="eyebrow mb-3">Savings</p>
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-semibold leading-none tabular text-[var(--battery)]">
              {eur(month.saved_eur, 0)}
            </span>
            <span className="text-[15px] text-muted">in {label}</span>
          </div>
          <TrendPill comparison={comparison} />
        </div>
        <p className="mt-2 text-[14px] leading-snug text-muted">
          {eur(month.saved_from_solar_eur, 0)} from using your own solar
          {month.feed_in_credit_eur > 0 && (
            <> + {eur(month.feed_in_credit_eur, 0)} from selling surplus back</>
          )}.
        </p>

        <div className="mt-5 grid grid-cols-2 border-t pt-4">
          <div className="pr-4">
            <div className="eyebrow mb-0.5">Spent so far</div>
            <div className="text-[20px] font-semibold text-[var(--home)] tabular">
              {eur(mtd.so_far_eur, 0)}
            </div>
          </div>
          <div className="border-l pl-4">
            <div className="eyebrow mb-0.5">Projected total</div>
            <div className="text-[20px] font-semibold text-[var(--home)] tabular">
              ~{eur(mtd.likely_total_eur, 0)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact savings/bill trend chip (cheaper / pricier / steady vs last 2 months). */
function TrendPill({ comparison }: { comparison: BillComparison }) {
  const { verdict, delta_eur } = comparison;
  const amount = eur(Math.abs(delta_eur), 0);
  const cfg =
    verdict === "better"
      ? { bg: "var(--battery-soft)", fg: "var(--battery)", icon: "↓", text: `${amount} less` }
      : verdict === "worse"
      ? { bg: "#fee2e2", fg: "#b91c1c", icon: "↑", text: `${amount} more` }
      : { bg: "var(--background)", fg: "var(--muted)", icon: "→", text: "same as last month" };
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold tabular"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span>{cfg.icon}</span>
      {cfg.text}
    </span>
  );
}

/* ---------------------------------------------------------------- live now */

function NodeIcon({
  cx, cy, r, device,
}: { cx: number; cy: number; r: number; device: string }) {
  const color = DEVICE_COLORS[device]?.color ?? "var(--muted)";
  const iconSize = Math.min(20, r * 0.82);
  const half = iconSize / 2;
  const scale = iconSize / 24;
  const sw = (2 / scale).toFixed(2);
  const base = { fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${cx - half},${cy - half}) scale(${scale})`} {...base}>
      {device === "solar" && <>
        <rect x="3" y="13" width="18" height="8" rx="1" />
        <path d="M5 13l1-4h12l1 4M9 9v4M15 9v4M3 17h18" />
        <path d="M12 3v3M7 5l1 1.5M17 5l-1 1.5" />
      </>}
      {device === "battery" && <>
        <rect x="3" y="7" width="16" height="10" rx="2" />
        <path d="M21 11v2" />
        <path d="M12 9l-1.5 2.5H13L11.5 15" />
      </>}
      {device === "grid" && <path d="M9 3 7 9h4l-2 6M15 3l-2 6h4l-2 6M5 21l4-9M19 21l-4-9M9 12h6" />}
      {device === "household" && <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>}
      {device === "heatpump" && <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>}
      {device === "ev" && <>
        <path d="M5 17h11M5 17a2 2 0 0 1-2-2v-3l2-4h9l2 4v5a2 2 0 0 1-2 0" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="14.5" cy="17.5" r="1.5" />
        <path d="M19 11l2 1v3a1.5 1.5 0 0 1-3 0v-2" />
      </>}
    </g>
  );
}

function EnergyFlowCard({
  live,
  household,
}: {
  live: Snapshot;
  household: AppData["household"];
}) {
  const PV = live.pv_production_kw;
  const batCharge = live.battery_charge_kw;
  const batDischarge = live.battery_discharge_kw;
  const batPct = Math.round(live.battery_soc_pct);
  const gridIn = live.grid_import_kw;
  const gridOut = live.grid_export_kw;
  const hp = live.heatpump_kw;
  const ev = live.ev_charging_kw;
  const home = live.house_load_kw;
  const on = (v: number) => v > 0.05;

  // Layout: solar top-center, battery left, grid right, house center, hp/ev bottom
  const SX = 150, SY = 30;
  const BX = 42,  BY = 118;
  const HX = 150, HY = 118;
  const GX = 258, GY = 118;
  const HPX = 90, HPY = 198;
  const EVX = 210, EVY = 198;
  const NR = 24, NRS = 18;

  const spd = (kw: number) => `${Math.max(0.5, 2.2 - kw * 0.35)}s`;
  const lw  = (kw: number) => `${Math.min(3.5, 1.2 + kw * 0.35)}`;
  const da  = "4 6";

  // ─ connection helper
  const FlowLine = ({ x1, y1, x2, y2, active, kw, color }: {
    x1: number; y1: number; x2: number; y2: number;
    active: boolean; kw?: number; color: string;
  }) => active && kw ? (
    <line {...{x1,y1,x2,y2}} stroke={color} strokeWidth={lw(kw)} strokeDasharray={da} opacity="0.9"
      style={{ animation: `flowDash ${spd(kw)} linear infinite` }} />
  ) : (
    <line {...{x1,y1,x2,y2}} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
  );

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: "var(--battery)" }} />
          <h3 className="text-[18px] font-semibold text-[var(--home)]">Right now</h3>
        </div>
        <span className="text-[12.5px] text-muted tabular">{live.outdoor_temp_c.toFixed(0)}° outside</span>
      </div>

      <svg viewBox="0 0 300 248" width="100%" aria-hidden style={{ display: "block", padding: "0 4px" }}>
        {/* ── connection lines ── */}
        {household.pv_kwp > 0 && (
          <FlowLine x1={SX} y1={SY+NR} x2={HX} y2={HY-NR}
            active={on(PV)} kw={PV} color="var(--solar)" />
        )}
        {household.battery_kwh > 0 && (on(batDischarge)
          ? <FlowLine x1={BX+NR} y1={BY} x2={HX-NR} y2={HY} active kw={batDischarge} color="var(--battery)" />
          : on(batCharge)
          ? <FlowLine x1={HX-NR} y1={HY} x2={BX+NR} y2={BY} active kw={batCharge} color="var(--solar)" />
          : <FlowLine x1={BX+NR} y1={BY} x2={HX-NR} y2={HY} active={false} color="var(--border)" />
        )}
        {on(gridIn)
          ? <FlowLine x1={GX-NR} y1={GY} x2={HX+NR} y2={HY} active kw={gridIn} color="var(--grid)" />
          : on(gridOut)
          ? <FlowLine x1={HX+NR} y1={HY} x2={GX-NR} y2={GY} active kw={gridOut} color="var(--solar)" />
          : <FlowLine x1={GX-NR} y1={GY} x2={HX+NR} y2={HY} active={false} color="var(--border)" />
        }
        {household.heat_pump && (
          <FlowLine x1={HX-18} y1={HY+NR} x2={HPX+NRS-3} y2={HPY-NRS}
            active={on(hp)} kw={hp} color="var(--heatpump)" />
        )}
        {household.ev_charger && (
          <FlowLine x1={HX+18} y1={HY+NR} x2={EVX-NRS+3} y2={EVY-NRS}
            active={on(ev)} kw={ev} color="var(--ev)" />
        )}

        {/* ── nodes ── */}
        {/* Solar */}
        {household.pv_kwp > 0 && <>
          <circle cx={SX} cy={SY} r={NR} fill="var(--solar-soft)" />
          <NodeIcon cx={SX} cy={SY} r={NR} device="solar" />
          <text x={SX} y={SY+NR+13} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600" letterSpacing="0.06">SOLAR</text>
          <text x={SX} y={SY+NR+25} textAnchor="middle" fontSize="12" fill="var(--home)" fontWeight="600">{PV.toFixed(1)} kW</text>
        </>}
        {/* Battery */}
        {household.battery_kwh > 0 && <>
          <circle cx={BX} cy={BY} r={NR} fill="var(--battery-soft)" />
          <NodeIcon cx={BX} cy={BY} r={NR} device="battery" />
          <text x={BX} y={BY+NR+13} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600" letterSpacing="0.06">BAT</text>
          <text x={BX} y={BY+NR+25} textAnchor="middle" fontSize="12" fill="var(--home)" fontWeight="600">{batPct}%</text>
        </>}
        {/* Grid */}
        <>
          <circle cx={GX} cy={GY} r={NR} fill="var(--grid-soft)" />
          <NodeIcon cx={GX} cy={GY} r={NR} device="grid" />
          <text x={GX} y={GY+NR+13} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600" letterSpacing="0.06">GRID</text>
          <text x={GX} y={GY+NR+25} textAnchor="middle" fontSize="12" fill="var(--home)" fontWeight="600">
            {on(gridOut) ? `↑${gridOut.toFixed(1)} kW` : on(gridIn) ? `↓${gridIn.toFixed(1)} kW` : "idle"}
          </text>
        </>
        {/* House (centre, slightly larger) */}
        <>
          <circle cx={HX} cy={HY} r={NR+4} fill="var(--sky)" stroke="var(--border)" strokeWidth="1.5" />
          <NodeIcon cx={HX} cy={HY} r={NR+4} device="household" />
          <text x={HX} y={HY+NR+18} textAnchor="middle" fontSize="12" fill="var(--home)" fontWeight="600">{home.toFixed(1)} kW</text>
        </>
        {/* Heat pump */}
        {household.heat_pump && <>
          <circle cx={HPX} cy={HPY} r={NRS} fill="#ede9fe" />
          <NodeIcon cx={HPX} cy={HPY} r={NRS} device="heatpump" />
          <text x={HPX} y={HPY+NRS+12} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600">HEAT</text>
          <text x={HPX} y={HPY+NRS+23} textAnchor="middle" fontSize="11" fill="var(--home)" fontWeight="600">{hp.toFixed(1)} kW</text>
        </>}
        {/* EV */}
        {household.ev_charger && <>
          <circle cx={EVX} cy={EVY} r={NRS} fill="#fff0e6" />
          <NodeIcon cx={EVX} cy={EVY} r={NRS} device="ev" />
          <text x={EVX} y={EVY+NRS+12} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600">CAR</text>
          <text x={EVX} y={EVY+NRS+23} textAnchor="middle" fontSize="11" fill="var(--home)" fontWeight="600">{ev > 0.1 ? `${ev.toFixed(1)} kW` : "idle"}</text>
        </>}
      </svg>
    </section>
  );
}

/* -------------------------------------------------------------- trend chart */

function TrendPanel({
  trend,
  currentMonth,
}: {
  trend: MonthSummary[];
  currentMonth: string;
}) {
  const maxVal = Math.max(...trend.flatMap((m) => [m.saved_eur, m.paid_eur]), 1);
  return (
    <section className="card p-5">
      <h3 className="text-[18px] font-semibold text-[var(--home)]">Saved vs paid</h3>
      <div
        className="mt-4 flex items-end justify-between gap-2"
        style={{ height: 120 }}
      >
        {trend.map((m) => {
          const isNow = m.month === currentMonth;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full items-end justify-center gap-1"
                style={{ height: 90 }}
              >
                <div
                  className="w-2.5 rounded-t bg-[var(--battery)]"
                  style={{ height: `${(m.saved_eur / maxVal) * 100}%` }}
                  title={`saved ${eur(m.saved_eur, 0)}`}
                />
                <div
                  className="w-2.5 rounded-t"
                  style={{
                    height: `${(m.paid_eur / maxVal) * 100}%`,
                    background: isNow ? "var(--home)" : "var(--border)",
                  }}
                  title={`paid ${eur(m.paid_eur, 0)}`}
                />
              </div>
              <span
                className={`text-[10.5px] ${
                  isNow ? "font-semibold text-[var(--home)]" : "text-muted"
                }`}
              >
                {m.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[12.5px] text-muted">
        <Legend color="var(--battery)" label="saved" />
        <Legend color="var(--home)" label="paid" />
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------- weather */

const SKY_BG: Record<string, string> = {
  sun:    "linear-gradient(155deg, #1260b8 0%, #2e8de8 55%, #62b8ff 100%)",
  partly: "linear-gradient(155deg, #1a6ec4 0%, #5090c8 60%, #90c4e8 100%)",
  cloud:  "linear-gradient(155deg, #4c5f6e 0%, #6e8494 60%, #a0b4be 100%)",
  rain:   "linear-gradient(155deg, #243240 0%, #3a5060 60%, #5a7884 100%)",
};

function WeatherPanel({ weather }: { weather: WeatherOutlook }) {
  const today = weather.days[0];
  const rest = weather.days.slice(1);
  const bg = today ? (SKY_BG[today.icon] ?? SKY_BG.cloud) : SKY_BG.cloud;
  const skyFilter = (icon: string) =>
    icon === "sun"
      ? "drop-shadow(0 0 6px rgba(255,210,60,0.5))"
      : "brightness(0) invert(1) opacity(0.85)";

  return (
    <section className="overflow-hidden rounded-[1.25rem]" style={{ background: bg }}>
      {/* Top */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/60">This week</p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug text-white">
            {weather.recommendation.title}
          </p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
          ~{weather.avg_sun_hours}h sun/day
        </span>
      </div>

      {/* Today hero */}
      {today && (
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <div>
            <span className="text-[52px] font-bold leading-none text-white tabular">{today.temp_c}°</span>
            <p className="mt-1 text-[13px] capitalize text-white/70">
              {today.weekday} · {today.solar_potential} solar
            </p>
          </div>
          <span style={{ filter: skyFilter(today.icon) }}>
            <Sky icon={today.icon} size={56} />
          </span>
        </div>
      )}

      {/* Forecast strip */}
      <div className="flex gap-0.5 border-t border-white/15 px-2 pb-3 pt-3">
        {rest.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-white/60">{d.weekday}</span>
            <span style={{ filter: skyFilter(d.icon) }}>
              <Sky icon={d.icon} size={15} />
            </span>
            <span className="text-[12px] font-semibold tabular text-white">{d.temp_c}°</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/70" style={{ width: `${(d.sun_hours / 11) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- ask */

function AskCard({
  questions,
  onAsk,
}: {
  questions: AppData["questions"];
  onAsk: () => void;
}) {
  return (
    <section className="card p-5">
      <h3 className="text-[18px] font-semibold text-[var(--home)]">
        Ask your companion
      </h3>
      <p className="mt-1 text-[15px] text-muted">
        Answers grounded in your real energy data.
      </p>
      <div className="mt-3 space-y-2">
        {questions.slice(0, 3).map((q) => (
          <button
            key={q.id ?? q.text}
            onClick={onAsk}
            className="flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[15px] text-[var(--home)] transition hover:border-[var(--home)]"
          >
            {q.text}
            <span className="text-muted">→</span>
          </button>
        ))}
      </div>
      <button
        onClick={onAsk}
        className="mt-3 w-full rounded-xl bg-[var(--home)] py-2.5 text-[15px] font-medium text-white transition hover:opacity-90"
      >
        Ask your own question
      </button>
    </section>
  );
}

function AskDrawer({
  householdId,
  questions,
  onClose,
}: {
  householdId: string;
  questions: AppData["questions"];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-screen w-full max-w-[460px] flex-col bg-[var(--background)] px-5 pb-5 pt-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[var(--home)]">
            <Send /> Ask your companion
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[var(--home)] transition hover:bg-[var(--background)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <AskScreen householdId={householdId} suggestions={questions} />
        </div>
      </div>
    </div>
  );
}
