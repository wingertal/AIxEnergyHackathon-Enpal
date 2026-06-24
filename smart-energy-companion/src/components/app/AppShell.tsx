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
  Bolt,
  Chevron,
  Sky,
  UnitIcon,
  RecGlyph,
  HealthGlyph,
  PiggyBank,
  REC_TONE,
  LIGHT_COLORS,
  HEALTH_COLORS,
  CONDITION_COLORS,
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
          <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--navy)]">
            Coach
          </span>
        </div>
        <select
          value={data.household.id}
          onChange={(e) => onSwitch(e.target.value)}
          className="rounded-full border bg-white px-3 py-1.5 text-[12.5px] font-medium text-[var(--home)] outline-none"
          aria-label="Switch household"
        >
          {data.households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name.replace("Familie ", "").replace("WG ", "")} · {h.city}
            </option>
          ))}
        </select>
      </div>
      <h1 className="mt-4 text-[25.92px] font-semibold tracking-tight text-[var(--home)]">
        {data.greeting}, {data.household.name.replace("Familie ", "").replace("WG ", "")}.
      </h1>
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
      <h1 className="text-[18px] font-semibold text-[var(--home)]">{title}</h1>
    </header>
  );
}

/* -------------------------------------------------------------------- home */

function Home({ data, go }: { data: AppData; go: (s: Screen) => void }) {
  return (
    <div className="space-y-5">
      {/* --- our coach layer, leading the homepage --- */}
      <div>
        <p className="eyebrow mb-2">Energy status</p>
        <LightStrip
          health={data.health}
          status={data.status}
          onClick={() => go({ name: "charge" })}
        />
      </div>
      <div>
        <p className="eyebrow mb-2">Savings</p>
        <SavingsHero
          month={data.month}
          mtd={data.monthToDate}
          comparison={data.billComparison}
          batteryRec={data.batteryRec}
          label={data.monthLabel}
          onClick={() => go({ name: "savings" })}
        />
      </div>
      <EquipmentSection
        units={data.equipment}
        onOpen={(unit) => go({ name: "equipment", unit })}
      />
      <ForYou recs={data.recommendations} />
      <WeekAhead weather={data.weather} onClick={() => go({ name: "weather" })} />

      <button
        onClick={() => go({ name: "ask" })}
        className="w-full rounded-2xl bg-[var(--home)] py-3.5 text-[15px] font-medium text-white transition active:opacity-90"
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
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-[18px] font-semibold text-[var(--navy)]">
          Your energy coach
        </h3>
        <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--navy)]">
          {recs.length} tips
        </span>
        <div className="ml-auto flex gap-1.5">
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
    <div className="card flex h-full flex-col border-l-4 p-4" style={{ borderLeftColor: t.color }}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: t.soft, color: t.color }}
        >
          <RecGlyph icon={rec.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[18px] font-semibold leading-snug text-[var(--navy)]">{rec.title}</h4>
            {rec.saving && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tabular"
                style={{ background: t.soft, color: t.color }}
              >
                {rec.saving}
              </span>
            )}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--foreground)]">{rec.detail}</p>
        </div>
      </div>
    </div>
  );
}

/* ① status strip, overall electricity: signal + where power is coming from */
const SOURCE_COLOR: Record<string, string> = {
  solar: "var(--solar)",
  battery: "var(--battery)",
  grid: "var(--grid)",
};

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
  const mix = status.mix;
  return (
    <button onClick={onClick} className="card card-interactive w-full p-4 text-left">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
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
            <span className="text-[18px] font-semibold text-[var(--home)]">
              {health.title}
            </span>
            <span
              className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{ background: c.soft, color: c.color }}
            >
              {health.badge}
            </span>
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--foreground)]">{health.reason}</p>
        </div>
      </div>

      {mix.sources.length > 0 && (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--background)]">
            {mix.sources.map((s) => (
              <div key={s.key} style={{ width: `${s.pct}%`, background: SOURCE_COLOR[s.key] }} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
            {mix.sources.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1 tabular">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: SOURCE_COLOR[s.key] }} />
                {s.pct}% {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t pt-2.5 text-[12.5px] text-muted tabular">
        <span>
          Using {health.consumption_kw} kW · {health.self_sufficiency_pct}% self-supplied
        </span>
        <span className="inline-flex items-center gap-0.5 font-medium text-[var(--home)]">
          Best time to use power <Chevron />
        </span>
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
  label,
  onClick,
}: {
  month: MonthSummary;
  mtd: MonthToDate;
  comparison: BillComparison;
  batteryRec: BatteryRecommendation | null;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card card-interactive w-full p-6 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "var(--battery-soft)", color: "var(--battery)" }}
          >
            <PiggyBank />
          </span>
          <span className="text-[12.5px] font-medium text-muted">Saved in {label}</span>
        </div>
        <TrendPill comparison={comparison} />
      </div>

      <div className="mt-3 text-[46px] font-semibold leading-none tabular text-[var(--battery)]">
        {eur(month.saved_eur, 0)}
      </div>
      <p className="mt-2 text-[15px] leading-snug text-[var(--foreground)]">
        {eur(month.saved_from_solar_eur, 0)} from using your own solar
        {month.feed_in_credit_eur > 0 && (
          <> + {eur(month.feed_in_credit_eur, 0)} from selling surplus back</>
        )}
        .
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
        <div>
          <div className="text-[12.5px] text-muted">Spent so far</div>
          <div className="text-[18px] font-semibold text-[var(--home)] tabular">
            {eur(mtd.so_far_eur, 0)}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-muted">Projected total</div>
          <div className="text-[18px] font-semibold text-[var(--home)] tabular">
            ~{eur(mtd.likely_total_eur, 0)}
          </div>
        </div>
      </div>

      {batteryRec && (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "var(--battery-soft)" }}
        >
          <span className="text-[15px] leading-none">💡</span>
          <span className="text-[15px] leading-snug text-[var(--home)]">
            Save about{" "}
            <span className="font-semibold text-[var(--battery)]">€{batteryRec.annual_eur}/yr</span>{" "}
            more with a home battery, store your spare solar instead of selling it cheaply.
          </span>
        </div>
      )}
    </button>
  );
}

/** Compact savings/bill trend chip (cheaper / pricier / steady vs last 2 months). */
function TrendPill({ comparison }: { comparison: BillComparison }) {
  const { verdict, delta_eur } = comparison;
  const amount = eur(Math.abs(delta_eur), 0);
  const cfg =
    verdict === "better"
      ? { bg: "var(--battery-soft)", fg: "var(--battery)", icon: "↓", text: `${amount} cheaper` }
      : verdict === "worse"
      ? { bg: "#fae3e2", fg: "var(--danger)", icon: "↑", text: `${amount} more` }
      : { bg: "var(--background)", fg: "var(--muted)", icon: "→", text: "same as last mo." };
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

/* ④ equipment cards */
function EquipmentSection({
  units,
  onOpen,
}: {
  units: EquipmentUnit[];
  onOpen: (unit: string) => void;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-end justify-between">
        <h3 className="text-[18px] font-semibold text-[var(--home)]">Your equipment</h3>
        <ConditionLegend />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {units.map((u) => (
          <EquipmentCard key={u.key} unit={u} onClick={() => onOpen(u.key)} />
        ))}
      </div>
    </section>
  );
}

function ConditionLegend() {
  return (
    <div className="flex items-center gap-2.5 text-[10.5px] text-muted">
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
  return (
    <button
      onClick={onClick}
      className="card card-interactive flex flex-col p-3.5 text-left"
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: c.soft, color: c.color }}
        >
          <UnitIcon unit={unit.key} />
        </span>
        <span
          className="mt-1 inline-block h-2 w-2 rounded-full"
          style={{ background: c.color }}
          aria-hidden
        />
      </div>
      <div className="mt-2.5 text-[18px] font-semibold text-[var(--home)]">
        {unit.name}
      </div>
      <div className="mt-0.5 text-[15px] leading-snug text-muted line-clamp-2">
        {unit.status}
      </div>
      {unit.impact && unit.today_eur !== undefined && (
        <div className="mt-auto space-y-0.5 border-t pt-2 text-[10.5px] tabular">
          <div className="flex items-center justify-between">
            <span className="text-muted">
              {unit.impact === "saving" ? "Saved today" : "Cost today"}
            </span>
            <span
              className="font-semibold"
              style={{ color: unit.impact === "saving" ? "var(--battery)" : "var(--ev)" }}
            >
              {unit.impact === "saving" ? "+" : ""}
              {eur(unit.today_eur)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">This month</span>
            <span
              className="font-semibold"
              style={{ color: unit.impact === "saving" ? "var(--battery)" : "var(--ev)" }}
            >
              {unit.impact === "saving" ? "+" : ""}
              {eur(unit.month_eur ?? 0, 0)}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

/* ⑤ this week, one icon + the recommendation (full forecast lives in detail) */
function WeekAhead({ weather, onClick }: { weather: WeatherOutlook; onClick: () => void }) {
  const c = LIGHT_COLORS[weather.recommendation.light];
  const icon: "sun" | "partly" | "rain" =
    weather.recommendation.light === "green"
      ? "sun"
      : weather.recommendation.light === "yellow"
      ? "partly"
      : "rain";
  return (
    <button
      onClick={onClick}
      className="card card-interactive w-full border-l-4 p-5 text-left"
      style={{ borderLeftColor: c.color }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-medium uppercase tracking-wide text-muted">This week</span>
        <Chevron />
      </div>
      <div className="flex items-center gap-4">
        <Sky icon={icon} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-semibold leading-snug text-[var(--home)]">
            {weather.recommendation.title}
          </h3>
          <div className="mt-1 text-[12.5px] text-muted tabular">
            about {weather.avg_sun_hours}h of sun a day
          </div>
        </div>
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
      <h3 className="text-[18px] font-semibold text-[var(--home)]">Last 7 days</h3>
      <div className="mt-3 space-y-2">
        {days.map((d) => {
          const isBest = d.date === best.date;
          return (
            <div key={d.date} className="flex items-center gap-2.5">
              <span className="w-8 text-[12.5px] text-muted">{d.weekday}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(d.saved_eur / max) * 100}%`,
                    background: isBest ? "var(--battery)" : "var(--battery-soft)",
                  }}
                />
              </div>
              <span className="w-12 text-right text-[12.5px] font-medium text-[var(--home)] tabular">
                {eur(d.saved_eur)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[15px] text-muted">
        {best.weekday} was your best day, you saved {eur(best.saved_eur)}.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- details */

function ChargeDetail({ data }: { data: AppData }) {
  const { status, windows } = data;
  const c = LIGHT_COLORS[status.light];
  const onOwnPower = gridShare(status) < 15;
  // Fixed-tariff homes have the same price every hour, so "cheapest hours" is meaningless.
  const flatRate = windows.length > 0 && windows.every((w) => w.price === windows[0].price);
  return (
    <div className="space-y-4">
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ background: c.color }}>
          <Bolt className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-[21.6px] font-semibold text-[var(--home)]">{status.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">{status.reason}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--background)] px-3 py-1.5 text-[12.5px]">
          <span className="text-muted">Right now</span>
          {onOwnPower ? (
            <span className="font-semibold text-[var(--battery)]">free · your own solar</span>
          ) : (
            <span className="font-semibold text-[var(--home)] tabular">grid {status.price_cents}c/kWh</span>
          )}
        </div>
      </div>

      <div className="card p-5">
        {flatRate ? (
          <>
            <h3 className="text-[18px] font-semibold text-[var(--home)]">
              Your grid price today
            </h3>
            <div className="mt-3 rounded-xl bg-[var(--background)] px-4 py-4 text-center">
              <div className="text-[24px] font-semibold text-[var(--home)] tabular">
                {(windows[0].price * 100).toFixed(1)}c
                <span className="text-[12.5px] font-normal text-muted">/kWh</span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted">same price all day</div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--foreground)]">
              You&apos;re on a fixed price, so grid power costs the same at every hour. Run
              appliances whenever suits you, and use your own solar first since it&apos;s
              cheaper than the grid.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-[18px] font-semibold text-[var(--home)]">
              Cheapest times to use power today
            </h3>
            <div className="mt-3 flex gap-2">
              {windows.map((w) => (
                <div
                  key={w.time}
                  className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{ background: w.rank === 1 ? c.soft : "var(--background)" }}
                >
                  <div className="text-[18px] font-semibold text-[var(--home)] tabular">{w.time}</div>
                  <div className="text-[12.5px] text-muted tabular">{(w.price * 100).toFixed(1)}c</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--foreground)]">
              {onOwnPower
                ? "Your solar is covering the home for free right now. When you do need the grid, in the evening or for the car, these are today's cheapest hours."
                : "Run the dishwasher, laundry or EV charging in these windows to pay the least."}
            </p>
          </>
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
        <span className="text-[12.5px] font-medium text-muted">In {monthLabel}</span>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[12.5px] text-muted">You saved</div>
            <div className="text-[30px] font-semibold leading-none tabular text-[var(--battery)]">
              {eur(month.saved_eur, 0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12.5px] text-muted">You paid</div>
            <div className="text-[22px] font-semibold leading-none tabular text-[var(--home)]">
              {eur(month.paid_eur, 0)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--foreground)]">
          Without your solar, this month would have cost about{" "}
          <span className="font-semibold text-[var(--home)]">{eur(month.bill_without_solar_eur, 0)}</span>. You
          used {month.self_consumed_kwh.toFixed(0)} kWh of your own power and earned{" "}
          {eur(month.feed_in_credit_eur)} feeding surplus back.
        </p>
        {tariffSaving > 0 && (
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">
            Your tariff is also a good fit, about{" "}
            <span className="font-semibold text-[var(--home)]">{eur(tariffSaving, 0)}/yr</span> cheaper than a
            standard plan.
          </p>
        )}
      </div>

      {batteryRec && (
        <div className="card border-l-4 p-5" style={{ borderLeftColor: "var(--solar)" }}>
          <div className="flex items-center gap-2">
            <span>💡</span>
            <h3 className="text-[18px] font-semibold text-[var(--home)]">Money on the table</h3>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">
            You sent <span className="font-semibold text-[var(--home)]">{batteryRec.exported_kwh.toFixed(0)} kWh</span> of
            spare solar to the grid this year for a small feed-in payment. A home battery (~{batteryRec.suggested_kwh} kWh)
            would store it for the evening instead, saving roughly{" "}
            <span className="font-semibold text-[var(--battery)]">€{batteryRec.annual_eur} a year</span>.
          </p>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-[18px] font-semibold text-[var(--home)]">Last months</h3>
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
                <span className={`text-[10.5px] ${isNow ? "font-semibold text-[var(--home)]" : "text-muted"}`}>
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
        return (
          <div key={u.key} className="card border-l-4 p-5" style={{ borderLeftColor: c.color }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: c.color }}>
                <UnitIcon unit={u.key} />
                <span className="text-[18px] font-semibold text-[var(--home)]">{u.name}</span>
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold"
                style={{ background: c.soft, color: c.color }}
              >
                {u.status}
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">{u.why}</p>
            {u.impact && u.today_eur !== undefined && (
              <div className="mt-3 flex gap-6 border-t pt-3">
                <div>
                  <div className="text-[12.5px] text-muted">
                    {u.impact === "saving" ? "Saved today" : "Cost today"}
                  </div>
                  <div
                    className="text-[18px] font-semibold tabular"
                    style={{ color: u.impact === "saving" ? "var(--battery)" : "var(--ev)" }}
                  >
                    {u.impact === "saving" ? "+" : ""}
                    {eur(u.today_eur)}
                  </div>
                </div>
                <div>
                  <div className="text-[12.5px] text-muted">This month</div>
                  <div
                    className="text-[18px] font-semibold tabular"
                    style={{ color: u.impact === "saving" ? "var(--battery)" : "var(--ev)" }}
                  >
                    {u.impact === "saving" ? "+" : ""}
                    {eur(u.month_eur ?? 0, 0)}
                  </div>
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
  const c = LIGHT_COLORS[weather.recommendation.light];
  return (
    <div className="space-y-4">
      <div className="card border-l-4 p-5" style={{ borderLeftColor: c.color }}>
        <h2 className="text-[18px] font-semibold text-[var(--home)]">{weather.recommendation.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]">{weather.recommendation.detail}</p>
      </div>

      <div className="card p-3">
        {weather.days.map((d, i) => (
          <div key={d.date} className={`flex items-center gap-3 px-2 py-2.5 ${i > 0 ? "border-t" : ""}`}>
            <span className="w-9 text-[12.5px] font-medium text-[var(--home)]">{d.weekday}</span>
            <Sky icon={d.icon} size={22} />
            <span className="w-10 text-[12.5px] tabular text-[var(--home)]">{d.temp_c}°</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
                <div className="h-full rounded-full" style={{ width: `${(d.sun_hours / 11) * 100}%`, background: "var(--solar)" }} />
              </div>
            </div>
            <span className="w-12 text-right text-[12.5px] text-muted tabular">{d.sun_hours}h sun</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-[12.5px] text-muted">
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
