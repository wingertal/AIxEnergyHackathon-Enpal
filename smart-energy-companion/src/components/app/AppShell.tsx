"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  TrafficStatus,
  EnergyHealth,
  MonthSummary,
  MonthToDate,
  BillComparison,
  DailySaving,
  EquipmentUnit,
  BatteryRecommendation,
  TariffComparison,
  Recommendation,
  PriceWindow,
  SuggestedQuestion,
} from "@/lib/data";
import type { Snapshot } from "@/lib/types";
import type { WeatherOutlook } from "@/lib/weather";
import { eur } from "@/lib/format";
import {
  Back,
  Chevron,
  HealthGlyph,
  Sky,
  UnitIcon,

  REC_TONE,
  LIGHT_COLORS,
  HEALTH_COLORS,
  CONDITION_COLORS,
  DEVICE_COLORS,
} from "./icons";
import { AskScreen } from "./AskScreen";

export interface AppData {
  household: {
    id: string;
    name: string;
    city: string;
    pv_kwp: number;
    battery_kwh: number;
    heat_pump: boolean;
    ev_charger: boolean;
  };
  households: { id: string; name: string; city: string }[];
  status: TrafficStatus;
  health: EnergyHealth;
  recommendations: Recommendation[];
  windows: PriceWindow[];
  month: MonthSummary;
  trend: MonthSummary[];
  monthToDate: MonthToDate;
  billComparison: BillComparison;
  dailySavings: DailySaving[];
  equipment: EquipmentUnit[];
  live: Snapshot;
  batteryRec: BatteryRecommendation | null;
  tariff: TariffComparison;
  weather: WeatherOutlook;
  questions: SuggestedQuestion[];
  monthLabel: string;
  greeting: string;
  dataDate: string; // human-readable reference date e.g. "20 Jun 2025"
}

type Screen =
  | { name: "home" }
  | { name: "charge" }
  | { name: "savings" }
  | { name: "equipment"; unit?: string }
  | { name: "weather" }
  | { name: "ask"; question?: string };

const TITLES: Record<Screen["name"], string> = {
  home: "",
  charge: "Best time to use power",
  savings: "Your savings",
  equipment: "Your equipment",
  weather: "This week's outlook",
  ask: "Ask your companion",
};

export function AppShell({ data }: { data: AppData }) {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const router = useRouter();
  const go = (s: Screen) => setScreen(s);
  const home = () => setScreen({ name: "home" });

  return (
    <div className="mx-auto min-h-screen max-w-[440px] bg-[var(--background)] px-5 pb-12 pt-6">
      {screen.name === "home" ? (
        <HomeHeader data={data} onSwitch={(id) => router.push(`/?hh=${id}`)} />
      ) : (
        <DetailHeader title={TITLES[screen.name]} onBack={home} />
      )}

      <div key={screen.name} className="fade-up">
        {screen.name === "home" && <Home data={data} go={go} />}
        {screen.name === "charge" && <ChargeDetail data={data} />}
        {screen.name === "savings" && <SavingsDetail data={data} />}
        {screen.name === "equipment" && <EquipmentDetail data={data} focus={screen.unit} />}
        {screen.name === "weather" && <WeatherDetail data={data} />}
        {screen.name === "ask" && (
          <AskScreen
            householdId={data.household.id}
            preset={screen.question}
            suggestions={data.questions}
          />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- headers */

function HomeHeader({ data, onSwitch }: { data: AppData; onSwitch: (id: string) => void }) {
  return (
    <header className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold tracking-tight text-[var(--navy)]">
            Enpal<span className="text-[var(--gold)]">.</span>
          </span>
          <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 t-label font-semibold text-[var(--navy)]">
            Coach
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="t-label text-muted">{data.dataDate}</span>
          <select
            value={data.household.id}
            onChange={(e) => onSwitch(e.target.value)}
            className="rounded-full border bg-white px-3 py-1.5 t-label font-medium text-[var(--home)] outline-none"
            aria-label="Switch household"
          >
            {data.households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name.replace("Familie ", "").replace("WG ", "")} · {h.city}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="mb-5 flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[var(--home)] active:scale-95 transition-transform"
        aria-label="Back"
      >
        <Back />
      </button>
      <h1 className="t-title text-[var(--home)]">{title}</h1>
    </header>
  );
}

/* -------------------------------------------------------------------- home */

function Home({ data, go }: { data: AppData; go: (s: Screen) => void }) {
  return (
    <div className="space-y-6">
      {/* ─ swap eyebrow ↔ t-title below to toggle label style across all sections ─ */}
      <section className="space-y-3">
        <p className="eyebrow">Energy status</p>
        {/* big-title version: <h2 className="t-title text-[var(--home)]">Energy status</h2> */}
        <LightStrip
          health={data.health}
          status={data.status}
          onClick={() => go({ name: "charge" })}
        />
      </section>

      <ForYou recs={data.recommendations} />

      <section className="space-y-3">
        <p className="eyebrow">Saved in {data.monthLabel}</p>
        <SavingsHero
          month={data.month}
          mtd={data.monthToDate}
          comparison={data.billComparison}
          batteryRec={data.batteryRec}
          label={data.monthLabel}
          onClick={() => go({ name: "savings" })}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <p className="eyebrow">Your equipment</p>
          <ConditionLegend />
        </div>
        <EquipmentSection
          units={data.equipment}
          onOpen={(unit) => go({ name: "equipment", unit })}
        />
      </section>

      <section className="space-y-3">
        <p className="eyebrow">This week</p>
        <WeekAhead weather={data.weather} onClick={() => go({ name: "weather" })} />
      </section>

      <button
        onClick={() => go({ name: "ask" })}
        className="w-full rounded-2xl bg-[var(--navy)] py-4 t-body font-medium text-white transition active:opacity-90"
      >
        Ask a question
      </button>
    </div>
  );
}

/* ② For you, personalized recommendation carousel (our differentiator) */
function ForYou({ recs }: { recs: Recommendation[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (!recs.length) return null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bd = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const ch = c as HTMLElement;
      const cc = ch.offsetLeft + ch.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setActive(best);
  };

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const ch = el.children[Math.max(0, Math.min(recs.length - 1, i))] as HTMLElement;
    ch?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">For you</p>
        <div className="flex gap-1.5">
          <CarouselArrow dir="prev" disabled={active === 0} onClick={() => goTo(active - 1)} />
          <CarouselArrow dir="next" disabled={active === recs.length - 1} onClick={() => goTo(active + 1)} />
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5"
      >
        {recs.map((r) => (
          <div key={r.id} className="w-[86%] shrink-0 snap-center">
            <RecCard rec={r} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {recs.map((r, i) => (
          <button
            key={r.id}
            onClick={() => goTo(i)}
            aria-label={`Tip ${i + 1}`}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === active ? 18 : 6,
              background: i === active ? "var(--navy)" : "var(--border)",
            }}
          />
        ))}
      </div>
    </section>
  );
}

function CarouselArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir}
      className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[var(--navy)] disabled:opacity-30 active:scale-95 transition"
    >
      <span className={dir === "prev" ? "rotate-180" : ""}>
        <Chevron />
      </span>
    </button>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const t = REC_TONE[rec.tone];
  return (
    <div className="card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="t-heading leading-snug text-[var(--navy)]">{rec.title}</h4>
        {rec.saving && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 t-label font-semibold tabular"
            style={{ background: t.soft, color: t.color }}
          >
            {rec.saving}
          </span>
        )}
      </div>
      <p className="mt-1.5 t-caption">{rec.detail}</p>
    </div>
  );
}

/* ① status strip */
function gridShare(status: TrafficStatus): number {
  return status.mix.sources.find((s) => s.key === "grid")?.pct ?? 0;
}

function LightStrip({
  health,
  status,
  onClick,
}: {
  health: EnergyHealth;
  status: TrafficStatus;
  onClick: () => void;
}) {
  const c = HEALTH_COLORS[health.level];
  const onOwnPower = gridShare(status) < 15;
  return (
    <button onClick={onClick} className="card card-interactive w-full p-4 text-left">
      {/* Status header — no icon, dot carries the color signal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="live-dot inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: c.color }}
          />
          <span className="t-heading text-[var(--home)]">{health.title}</span>
        </div>
        <Chevron />
      </div>

      {/* Three-part metrics */}
      <div className="mt-4 grid grid-cols-3 divide-x border-t pt-4">
        <div className="pr-3">
          <p className="eyebrow mb-1">Self-powered</p>
          <p className="t-metric text-[var(--home)]">{health.self_sufficiency_pct}%</p>
        </div>
        <div className="px-3">
          <p className="eyebrow mb-1">Using now</p>
          <p className="t-metric text-[var(--home)]">{status.house_load_kw.toFixed(1)} kW</p>
        </div>
        <div className="pl-3">
          <p className="eyebrow mb-1">Power cost</p>
          <p
            className="t-metric"
            style={{ color: onOwnPower ? "var(--battery)" : "var(--home)" }}
          >
            {onOwnPower ? "Free" : `${status.price_cents}c`}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ② savings hero (+ bill subline + battery nudge) */
function SavingsHero({
  month,
  mtd,
  comparison,
  batteryRec,
  onClick,
}: {
  month: MonthSummary;
  mtd: MonthToDate;
  comparison: BillComparison;
  batteryRec: BatteryRecommendation | null;
  label: string;
  onClick: () => void;
}) {
  const { verdict, delta_eur } = comparison;
  const deltaAmt = eur(Math.abs(delta_eur), 0);
  const trendText =
    verdict === "better"
      ? `↓ ${deltaAmt} cheaper than last month`
      : verdict === "worse"
      ? `↑ ${deltaAmt} more than last month`
      : "→ Same as last month";

  return (
    <button onClick={onClick} className="card card-interactive w-full p-5 text-left">
      <div className="t-display text-[var(--battery)]">{eur(month.saved_eur, 0)}</div>
      <p className="mt-1.5 t-caption">
        {eur(month.saved_from_solar_eur, 0)} from your own solar
        {month.feed_in_credit_eur > 0 && (
          <> · {eur(month.feed_in_credit_eur, 0)} feed-in credit</>
        )}.
      </p>

      <div className="mt-4 grid grid-cols-2 border-t pt-4">
        <div className="pr-4">
          <p className="eyebrow mb-0.5">Bill so far</p>
          <p className="t-metric text-[var(--home)]">{eur(mtd.so_far_eur, 0)}</p>
        </div>
        <div className="border-l pl-4">
          <p className="eyebrow mb-0.5">Likely total</p>
          <p className="t-metric text-[var(--home)]">~{eur(mtd.likely_total_eur, 0)}</p>
        </div>
      </div>

      <p
        className="mt-3 t-label"
        style={{ color: verdict === "better" ? "var(--battery)" : verdict === "worse" ? "var(--danger)" : "var(--muted)" }}
      >
        {trendText}
      </p>

      {batteryRec && (
        <div className="mt-3 rounded-xl bg-[var(--background)] px-3 py-2.5">
          <p className="t-caption">
            💡 Add a battery — save about{" "}
            <span className="font-semibold text-[var(--navy)]">€{batteryRec.annual_eur}/yr</span> more.
          </p>
        </div>
      )}
    </button>
  );
}

/* ④ equipment cards */
function EquipmentSection({
  units,
  onOpen,
}: {
  units: EquipmentUnit[];
  onOpen: (unit: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {units.map((u) => (
        <EquipmentCard key={u.key} unit={u} onClick={() => onOpen(u.key)} />
      ))}
    </div>
  );
}

function ConditionLegend() {
  return (
    <div className="flex items-center gap-2.5 t-label text-muted">
      <span className="inline-flex items-center gap-1">
        <Dot c="green" /> fine
      </span>
      <span className="inline-flex items-center gap-1">
        <Dot c="amber" /> check
      </span>
      <span className="inline-flex items-center gap-1">
        <Dot c="grey" /> idle
      </span>
    </div>
  );
}

function Dot({ c }: { c: "green" | "amber" | "grey" }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: CONDITION_COLORS[c].color }}
    />
  );
}

function EquipmentCard({ unit, onClick }: { unit: EquipmentUnit; onClick: () => void }) {
  const c = CONDITION_COLORS[unit.condition];
  const d = DEVICE_COLORS[unit.key] ?? { color: "var(--muted)", soft: "var(--background)" };
  return (
    <button
      onClick={onClick}
      className="card card-interactive flex flex-col p-3.5 text-left"
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: d.soft, color: d.color }}
        >
          <UnitIcon unit={unit.key} />
        </span>
        <span
          className="mt-1 inline-block h-2 w-2 rounded-full"
          style={{ background: c.color }}
          aria-hidden
        />
      </div>
      <div className="mt-2.5 t-heading text-[var(--home)]">
        {unit.name}
      </div>
      <div className="mt-0.5 t-caption line-clamp-2">
        {unit.status}
      </div>
    </button>
  );
}

/* ⑤ this week, one icon + the recommendation (full forecast lives in detail) */
function WeekAhead({ weather, onClick }: { weather: WeatherOutlook; onClick: () => void }) {
  const icon: "sun" | "partly" | "rain" =
    weather.recommendation.light === "green"
      ? "sun"
      : weather.recommendation.light === "yellow"
      ? "partly"
      : "rain";
  return (
    <button
      onClick={onClick}
      className="card card-interactive w-full p-4 text-left"
    >
      <div className="flex items-center gap-4">
        <Sky icon={icon} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="t-heading leading-snug text-[var(--home)]">
            {weather.recommendation.title}
          </h3>
          <p className="mt-0.5 t-caption">about {weather.avg_sun_hours}h of sun a day</p>
        </div>
        <Chevron />
      </div>
    </button>
  );
}

/* ⑥ last 7 days savings */
function LastWeek({ days }: { days: DailySaving[] }) {
  const max = Math.max(...days.map((d) => d.saved_eur), 0.01);
  const best = days.reduce((a, b) => (b.saved_eur > a.saved_eur ? b : a), days[0]);
  return (
    <div className="card w-full p-5">
      <h3 className="t-title text-[var(--home)]">Last 7 days</h3>
      <div className="mt-3 space-y-2">
        {days.map((d) => {
          const isBest = d.date === best.date;
          return (
            <div key={d.date} className="flex items-center gap-2.5">
              <span className="w-8 t-label text-muted">{d.weekday}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(d.saved_eur / max) * 100}%`,
                    background: isBest ? "var(--battery)" : "var(--battery-soft)",
                  }}
                />
              </div>
              <span className="w-12 text-right t-label font-medium text-[var(--home)] tabular">
                {eur(d.saved_eur)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 t-caption">
        {best.weekday} was your best day, you saved {eur(best.saved_eur)}.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- details */

function ChargeDetail({ data }: { data: AppData }) {
  const { status, windows, health } = data;
  const hc = HEALTH_COLORS[health.level];
  const sc = LIGHT_COLORS[status.light];
  const onOwnPower = gridShare(status) < 15;
  const flatRate = windows.length > 0 && windows.every((w) => w.price === windows[0].price);

  return (
    <div className="space-y-4">
      {/* ① Health status — driven by health.level, matches the home screen dot */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: hc.color }}
          >
            <HealthGlyph level={health.level} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-heading text-[var(--home)]">{health.title}</p>
            <p className="mt-1 t-body text-[var(--foreground)]">{health.reason}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x border-t pt-4">
          <div className="pr-3">
            <p className="eyebrow mb-1">Self-powered</p>
            <p className="t-metric text-[var(--home)]">{health.self_sufficiency_pct}%</p>
          </div>
          <div className="px-3">
            <p className="eyebrow mb-1">Using now</p>
            <p className="t-metric text-[var(--home)]">{status.house_load_kw.toFixed(1)} kW</p>
          </div>
          <div className="pl-3">
            <p className="eyebrow mb-1">Power cost</p>
            <p
              className="t-metric"
              style={{ color: onOwnPower ? "var(--battery)" : "var(--home)" }}
            >
              {onOwnPower ? "Free" : `${status.price_cents}c`}
            </p>
          </div>
        </div>
      </div>

      {/* ② Price timing — when is cheapest to use grid */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: sc.color }}
          />
          <h3 className="t-heading text-[var(--home)]">
            {flatRate ? "Your grid price today" : "Cheapest times today"}
          </h3>
        </div>
        <p className="t-body text-[var(--foreground)]">{status.reason}</p>

        {flatRate ? (
          <div className="mt-3 rounded-xl bg-[var(--background)] px-4 py-3 text-center">
            <div className="t-metric tabular text-[var(--home)]">
              {(windows[0].price * 100).toFixed(1)}c
              <span className="t-label font-normal text-muted">/kWh</span>
            </div>
            <div className="mt-0.5 t-label text-muted">same price all day</div>
          </div>
        ) : (
          windows.length > 0 && (
            <div className="mt-3 flex gap-2">
              {windows.map((w) => (
                <div
                  key={w.time}
                  className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{ background: w.rank === 1 ? sc.soft : "var(--background)" }}
                >
                  <div className="t-heading tabular text-[var(--home)]">{w.time}</div>
                  <div className="t-label tabular text-muted">{(w.price * 100).toFixed(1)}c</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SavingsDetail({ data }: { data: AppData }) {
  const { month, trend, monthLabel, tariff, batteryRec } = data;
  const maxVal = Math.max(...trend.flatMap((m) => [m.saved_eur, m.paid_eur]), 1);
  const tariffSaving = tariff.better === "current" ? Math.abs(tariff.savings_eur) : 0;
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <p className="eyebrow">In {monthLabel}</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="t-label text-muted">You saved</p>
            <p className="t-display text-[var(--battery)]">{eur(month.saved_eur, 0)}</p>
          </div>
          <div>
            <p className="t-label text-muted">You paid</p>
            <p className="t-metric text-[var(--home)]">{eur(month.paid_eur, 0)}</p>
          </div>
        </div>
        <p className="mt-4 t-body text-[var(--foreground)]">
          Without your solar, this month would have cost about{" "}
          <span className="font-semibold text-[var(--home)]">{eur(month.bill_without_solar_eur, 0)}</span>. You
          used {month.self_consumed_kwh.toFixed(0)} kWh of your own power and earned{" "}
          {eur(month.feed_in_credit_eur)} feeding surplus back.
        </p>
        {tariffSaving > 0 && (
          <p className="mt-2 t-body text-[var(--foreground)]">
            Your tariff is also a good fit, about{" "}
            <span className="font-semibold text-[var(--home)]">{eur(tariffSaving, 0)}/yr</span> cheaper than a
            standard plan.
          </p>
        )}
      </div>

      {batteryRec && (
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <h3 className="t-heading text-[var(--home)]">Money on the table</h3>
          </div>
          <p className="mt-2 t-body text-[var(--foreground)]">
            You sent <span className="font-semibold text-[var(--home)]">{batteryRec.exported_kwh.toFixed(0)} kWh</span> of
            spare solar to the grid this year for a small feed-in payment. A home battery (~{batteryRec.suggested_kwh} kWh)
            would store it for the evening instead, saving roughly{" "}
            <span className="font-semibold text-[var(--battery)]">€{batteryRec.annual_eur} a year</span>.
          </p>
        </div>
      )}

      <div className="card p-5">
        <h3 className="t-title text-[var(--home)]">Last months</h3>
        <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 120 }}>
          {trend.map((m) => {
            const isNow = m.month === month.month;
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 90 }}>
                  <div className="w-2.5 rounded-t bg-[var(--battery)]" style={{ height: `${(m.saved_eur / maxVal) * 100}%` }} />
                  <div
                    className="w-2.5 rounded-t"
                    style={{ height: `${(m.paid_eur / maxVal) * 100}%`, background: isNow ? "var(--home)" : "var(--border)" }}
                  />
                </div>
                <span className={`t-label ${isNow ? "font-semibold text-[var(--home)]" : "text-muted"}`}>
                  {m.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 t-label text-muted">
          <Legend color="var(--battery)" label="saved" />
          <Legend color="var(--home)" label="paid" />
        </div>
      </div>

      <LastWeek days={data.dailySavings} />
    </div>
  );
}

function EquipmentDetail({ data, focus }: { data: AppData; focus?: string }) {
  // put the focused unit first
  const units = [...data.equipment].sort((a, b) =>
    a.key === focus ? -1 : b.key === focus ? 1 : 0
  );
  return (
    <div className="space-y-3">
      {units.map((u) => {
        const c = CONDITION_COLORS[u.condition];
        const d = DEVICE_COLORS[u.key] ?? { color: "var(--muted)", soft: "var(--background)" };
        return (
          <div key={u.key} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: d.color }}>
                <UnitIcon unit={u.key} />
                <span className="t-heading text-[var(--home)]">{u.name}</span>
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 t-label font-semibold"
                style={{ background: c.soft, color: c.color }}
              >
                {u.status}
              </span>
            </div>
            <p className="mt-2 t-body text-[var(--foreground)]">{u.why}</p>
            {u.impact && u.today_eur !== undefined && (
              <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="t-label text-muted">{u.impact === "saving" ? "Saved today" : "Cost today"}</p>
                  <p
                    className="t-metric tabular mt-0.5"
                    style={{ color: "var(--home)" }}
                  >
                    {u.impact === "saving" ? "+" : ""}{eur(u.today_eur)}
                  </p>
                </div>
                <div>
                  <p className="t-label text-muted">This month</p>
                  <p
                    className="t-metric tabular mt-0.5"
                    style={{ color: "var(--home)" }}
                  >
                    {u.impact === "saving" ? "+" : ""}{eur(u.month_eur ?? 0, 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeatherDetail({ data }: { data: AppData }) {
  const { weather } = data;
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="t-title text-[var(--home)]">{weather.recommendation.title}</h2>
        <p className="mt-2 t-body text-[var(--foreground)]">{weather.recommendation.detail}</p>
      </div>

      <div className="card p-3">
        {weather.days.map((d, i) => (
          <div key={d.date} className={`flex items-center gap-3 px-2 py-2.5 ${i > 0 ? "border-t" : ""}`}>
            <span className="w-9 t-label font-medium text-[var(--home)]">{d.weekday}</span>
            <Sky icon={d.icon} size={22} />
            <span className="w-10 t-label tabular text-[var(--home)]">{d.temp_c}°</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
                <div className="h-full rounded-full" style={{ width: `${(d.sun_hours / 11) * 100}%`, background: "var(--solar)" }} />
              </div>
            </div>
            <span className="w-12 text-right t-label text-muted tabular">{d.sun_hours}h sun</span>
          </div>
        ))}
      </div>
      <p className="px-1 t-label text-muted">
        Forecast for {weather.city}. Solar potential shown as daily sun hours.
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
