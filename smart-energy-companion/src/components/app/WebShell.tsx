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
            <LivePanel live={data.live} household={data.household} />
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

        <div className="ml-2 hidden text-[15px] text-muted lg:block">
          {data.greeting}, {shortName(data.household.name)} ·{" "}
          <span className="text-[var(--home)]">{data.household.city}</span>
          <span className="ml-2 text-[12px] opacity-60">{data.dataDate}</span>
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
  const mix = status.mix;
  // Fixed-tariff homes have one flat price all day, so "cheapest hours" is meaningless.
  const flatRate = windows.length > 0 && windows.every((w) => w.price === windows[0].price);
  return (
    <section className="card p-6">
      <p className="eyebrow mb-3">Energy status</p>
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: c.color }}
        >
          <HealthGlyph level={health.level} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="live-dot inline-block h-2 w-2 rounded-full"
              style={{ background: c.color }}
            />
            <h2 className="text-[18px] font-semibold text-[var(--home)]">
              {health.title}
            </h2>
            <span
              className="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold"
              style={{ background: c.soft, color: c.color }}
            >
              {health.badge}
            </span>
          </div>
          <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-[var(--foreground)]">
            {health.reason}
          </p>
          <p className="mt-2 text-[15px] text-muted tabular">
            Using {health.consumption_kw} kW · {health.self_sufficiency_pct}% self-supplied · grid {health.price_cents}c/kWh
          </p>
        </div>
      </div>

      {mix.sources.length > 0 && (
        <div className="mt-5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--background)]">
            {mix.sources.map((s) => (
              <div
                key={s.key}
                style={{ width: `${s.pct}%`, background: SOURCE_COLOR[s.key] }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            {mix.sources.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 tabular">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: SOURCE_COLOR[s.key] }}
                />
                {s.pct}% {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 border-t pt-4">
        {flatRate ? (
          <>
            <h3 className="text-[18px] font-semibold text-[var(--home)]">Your grid price today</h3>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--background)] px-4 py-3">
              <div className="text-[20px] font-semibold text-[var(--home)] tabular">
                {(windows[0].price * 100).toFixed(1)}c
                <span className="text-[15px] font-normal text-muted">/kWh</span>
              </div>
              <span className="text-[15px] text-muted">
                Fixed price, the same every hour. Run appliances whenever suits you, and use
                your own solar first since it&apos;s cheaper than the grid.
              </span>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-[18px] font-semibold text-[var(--home)]">
              Cheapest times to use power today
            </h3>
            <div className="mt-3 flex gap-3">
              {windows.map((w) => (
                <div
                  key={w.time}
                  className="flex-1 rounded-xl px-3 py-3 text-center"
                  style={{ background: w.rank === 1 ? c.soft : "var(--background)" }}
                >
                  <div className="text-[18px] font-semibold text-[var(--home)] tabular">
                    {w.time}
                  </div>
                  <div className="text-[12.5px] text-muted tabular">
                    {(w.price * 100).toFixed(1)}c
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[18px] font-semibold text-[var(--home)]">in {label}</span>
          <TrendPill comparison={comparison} />
        </div>

        <div className="text-[48px] font-semibold leading-none tabular text-[var(--battery)]">
          {eur(month.saved_eur, 0)}
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

function LivePanel({
  live,
  household,
}: {
  live: Snapshot;
  household: AppData["household"];
}) {
  const rows: { label: string; value: string; show: boolean }[] = [
    { label: "Solar", value: `${live.pv_production_kw.toFixed(1)} kW`, show: household.pv_kwp > 0 },
    {
      label: "Battery",
      value: `${Math.round(live.battery_soc_pct)}%`,
      show: household.battery_kwh > 0,
    },
    {
      label: "Heat pump",
      value: `${live.heatpump_kw.toFixed(1)} kW`,
      show: household.heat_pump,
    },
    {
      label: "Car",
      value: live.ev_charging_kw > 0.1 ? `${live.ev_charging_kw.toFixed(1)} kW` : "idle",
      show: household.ev_charger,
    },
    { label: "Home load", value: `${live.total_consumption_kw.toFixed(1)} kW`, show: true },
    {
      label: live.grid_export_kw > 0.05 ? "Grid export" : "Grid import",
      value: `${(live.grid_export_kw > 0.05 ? live.grid_export_kw : live.grid_import_kw).toFixed(1)} kW`,
      show: true,
    },
  ];
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span
          className="live-dot inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--battery)" }}
        />
        <h3 className="text-[18px] font-semibold text-[var(--home)]">Right now</h3>
        <span className="ml-auto text-[12.5px] text-muted tabular">
          {live.outdoor_temp_c.toFixed(0)}° outside
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {rows
          .filter((r) => r.show)
          .map((r) => (
            <div key={r.label} className="flex items-baseline justify-between">
              <span className="text-[12.5px] text-muted">{r.label}</span>
              <span className="text-[18px] font-semibold text-[var(--home)] tabular">
                {r.value}
              </span>
            </div>
          ))}
      </div>
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

function WeatherPanel({ weather }: { weather: WeatherOutlook }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[var(--home)]">This week</h3>
        <span className="text-[12.5px] text-muted tabular">
          ~{weather.avg_sun_hours}h sun/day
        </span>
      </div>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-[var(--home)]">
        {weather.recommendation.title}
      </p>
      <div className="mt-3 space-y-1.5">
        {weather.days.map((d) => (
          <div key={d.date} className="flex items-center gap-2.5">
            <span className="w-8 text-[12.5px] text-muted">{d.weekday}</span>
            <Sky icon={d.icon} size={18} />
            <span className="w-8 text-[12.5px] text-[var(--home)] tabular">
              {d.temp_c}°
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(d.sun_hours / 11) * 100}%`,
                  background: "var(--solar)",
                }}
              />
            </div>
            <span className="w-12 text-right text-[10.5px] text-muted tabular">
              {d.sun_hours}h
            </span>
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
