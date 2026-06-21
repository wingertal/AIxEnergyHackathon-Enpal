"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TrafficStatus, MonthSummary, PriceWindow } from "@/lib/data";
import type { WeatherOutlook } from "@/lib/weather";
import type { PopularQuestion } from "@/lib/questions";
import { eur } from "@/lib/format";
import { Back, Bolt, Chevron, Leaf, PiggyBank, Sky, LIGHT_COLORS } from "./icons";
import { AskScreen } from "./AskScreen";

export interface AppData {
  household: { id: string; name: string; city: string; pv_kwp: number };
  households: { id: string; name: string; city: string }[];
  status: TrafficStatus;
  windows: PriceWindow[];
  month: MonthSummary;
  trend: MonthSummary[];
  weather: WeatherOutlook;
  questions: PopularQuestion[];
  monthLabel: string;
  greeting: string;
}

type Screen =
  | { name: "home" }
  | { name: "charge" }
  | { name: "savings" }
  | { name: "weather" }
  | { name: "ask"; question?: string };

const TITLES: Record<Screen["name"], string> = {
  home: "",
  charge: "Best time to use power",
  savings: "Saved vs. paid",
  weather: "This week's outlook",
  ask: "Ask your companion",
};

export function ClassicShell({ data }: { data: AppData }) {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const router = useRouter();
  const go = (s: Screen) => setScreen(s);
  const home = () => setScreen({ name: "home" });

  return (
    <div className="mx-auto min-h-screen max-w-[440px] bg-[var(--background)] px-5 pb-10 pt-6">
      {screen.name === "home" ? (
        <HomeHeader data={data} onSwitch={(id) => router.push(`/classic?hh=${id}`)} />
      ) : (
        <DetailHeader title={TITLES[screen.name]} onBack={home} />
      )}

      <div key={screen.name} className="fade-up">
        {screen.name === "home" && <Home data={data} go={go} />}
        {screen.name === "charge" && <ChargeDetail data={data} />}
        {screen.name === "savings" && <SavingsDetail data={data} />}
        {screen.name === "weather" && <WeatherDetail data={data} />}
        {screen.name === "ask" && (
          <AskScreen householdId={data.household.id} preset={screen.question} />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- headers */

function HomeHeader({
  data,
  onSwitch,
}: {
  data: AppData;
  onSwitch: (id: string) => void;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Leaf />
          <span className="text-[13px] font-semibold text-[var(--home)]">Companion</span>
          <a
            href="/"
            className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-muted"
          >
            v1 · see new ›
          </a>
        </div>
        <select
          value={data.household.id}
          onChange={(e) => onSwitch(e.target.value)}
          className="rounded-full border bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--home)] outline-none"
          aria-label="Switch household"
        >
          {data.households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name.replace("Familie ", "").replace("WG ", "")} · {h.city}
            </option>
          ))}
        </select>
      </div>
      <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--home)]">
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
      <h1 className="text-[17px] font-semibold text-[var(--home)]">{title}</h1>
    </header>
  );
}

/* -------------------------------------------------------------------- home */

function Home({ data, go }: { data: AppData; go: (s: Screen) => void }) {
  return (
    <div className="space-y-4">
      <StatusWidget status={data.status} onClick={() => go({ name: "charge" })} />

      <div className="grid grid-cols-2 gap-4">
        <SavingsWidget month={data.month} label={data.monthLabel} onClick={() => go({ name: "savings" })} />
        <WeatherWidget weather={data.weather} onClick={() => go({ name: "weather" })} />
      </div>

      <QuestionsWidget
        questions={data.questions}
        onAsk={(q) => go({ name: "ask", question: q })}
        onOpen={() => go({ name: "ask" })}
      />
    </div>
  );
}

function Tappable({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`card w-full p-5 text-left active:scale-[0.985] transition-transform ${className}`}
    >
      {children}
    </button>
  );
}

function StatusWidget({ status, onClick }: { status: TrafficStatus; onClick: () => void }) {
  const c = LIGHT_COLORS[status.light];
  return (
    <Tappable onClick={onClick}>
      <div className="flex items-start gap-4">
        <span
          className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: c.color }}
        >
          <Bolt />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
            <span className="text-[12px] font-medium" style={{ color: c.color }}>
              {c.label} time to use power
            </span>
          </div>
          <h2 className="mt-1 text-[17px] font-semibold leading-snug text-[var(--home)]">
            {status.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{status.reason}</p>
        </div>
        <span className="mt-1 text-muted">
          <Chevron />
        </span>
      </div>
    </Tappable>
  );
}

function SavingsWidget({
  month,
  label,
  onClick,
}: {
  month: MonthSummary;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tappable onClick={onClick} className="!p-4">
      <div className="flex items-center gap-2 text-[var(--battery)]">
        <PiggyBank />
        <span className="text-[12px] font-medium text-muted">Saved in {label}</span>
      </div>
      <div className="mt-2 text-[26px] font-semibold tabular text-[var(--battery)]">
        {eur(month.saved_eur, 0)}
      </div>
      <div className="mt-0.5 text-[12px] text-muted tabular">
        paid {eur(month.paid_eur, 0)}
      </div>
    </Tappable>
  );
}

function WeatherWidget({ weather, onClick }: { weather: WeatherOutlook; onClick: () => void }) {
  const c = LIGHT_COLORS[weather.recommendation.light];
  return (
    <Tappable onClick={onClick} className="!p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">This week</span>
        <Sky icon={weather.days[0].icon} size={24} />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
        <span className="text-[12px] font-semibold" style={{ color: c.color }}>
          {weather.avg_sun_hours}h sun/day
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-[var(--home)] line-clamp-2">
        {weather.recommendation.title}
      </p>
    </Tappable>
  );
}

function QuestionsWidget({
  questions,
  onAsk,
  onOpen,
}: {
  questions: PopularQuestion[];
  onAsk: (q: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[var(--home)]">People are asking</h3>
        <span className="text-[11px] text-muted">tap to get an answer</span>
      </div>
      <div className="mt-3 divide-y">
        {questions.slice(0, 3).map((item) => (
          <button
            key={item.q}
            onClick={() => onAsk(item.q)}
            className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60"
          >
            <span className="flex-1 text-[13px] text-[var(--home)]">{item.q}</span>
            <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-muted tabular">
              {fmtCount(item.asked_by)} asked
            </span>
            <span className="text-muted">
              <Chevron />
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onOpen}
        className="mt-3 w-full rounded-xl bg-[var(--home)] py-2.5 text-[13px] font-medium text-white active:opacity-90"
      >
        Ask your own question
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- details */

function ChargeDetail({ data }: { data: AppData }) {
  const { status, windows } = data;
  const c = LIGHT_COLORS[status.light];
  return (
    <div className="space-y-4">
      <div className="card p-6 text-center">
        <span
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"
          style={{ background: c.color }}
        >
          <Bolt className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-[19px] font-semibold text-[var(--home)]">{status.title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{status.reason}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--background)] px-3 py-1.5 text-[13px]">
          <span className="text-muted">Now</span>
          <span className="font-semibold text-[var(--home)] tabular">{status.price_cents}c/kWh</span>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-[15px] font-semibold text-[var(--home)]">Cheapest times today</h3>
        <div className="mt-3 flex gap-2">
          {windows.map((w) => (
            <div
              key={w.time}
              className="flex-1 rounded-xl px-3 py-2.5 text-center"
              style={{ background: w.rank === 1 ? c.soft : "var(--background)" }}
            >
              <div className="text-[15px] font-semibold text-[var(--home)] tabular">{w.time}</div>
              <div className="text-[11px] text-muted tabular">{(w.price * 100).toFixed(1)}c</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Run the dishwasher, laundry or EV charging in these windows to pay the least.
        </p>
      </div>
    </div>
  );
}

function SavingsDetail({ data }: { data: AppData }) {
  const { month, trend, monthLabel } = data;
  const maxVal = Math.max(...trend.flatMap((m) => [m.saved_eur, m.paid_eur]), 1);
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <span className="text-[12px] font-medium text-muted">In {monthLabel}</span>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[12px] text-muted">You saved</div>
            <div className="text-[30px] font-semibold leading-none tabular text-[var(--battery)]">
              {eur(month.saved_eur, 0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-muted">You paid</div>
            <div className="text-[22px] font-semibold leading-none tabular text-[var(--home)]">
              {eur(month.paid_eur, 0)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          Without your solar, this month would have cost about{" "}
          <span className="font-semibold text-[var(--home)]">{eur(month.bill_without_solar_eur, 0)}</span>. You
          used {month.self_consumed_kwh.toFixed(0)} kWh of your own power and earned{" "}
          {eur(month.feed_in_credit_eur)} feeding surplus back.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-[15px] font-semibold text-[var(--home)]">Last months</h3>
        <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 120 }}>
          {trend.map((m) => {
            const isNow = m.month === month.month;
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 90 }}>
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
                <span className={`text-[10px] ${isNow ? "font-semibold text-[var(--home)]" : "text-muted"}`}>
                  {m.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-muted">
          <Legend color="var(--battery)" label="saved" />
          <Legend color="var(--home)" label="paid" />
        </div>
      </div>
    </div>
  );
}

function WeatherDetail({ data }: { data: AppData }) {
  const { weather } = data;
  const c = LIGHT_COLORS[weather.recommendation.light];
  return (
    <div className="space-y-4">
      <div className="card border-l-4 p-5" style={{ borderLeftColor: c.color }}>
        <h2 className="text-[16px] font-semibold text-[var(--home)]">
          {weather.recommendation.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{weather.recommendation.detail}</p>
      </div>

      <div className="card p-3">
        {weather.days.map((d, i) => (
          <div
            key={d.date}
            className={`flex items-center gap-3 px-2 py-2.5 ${i > 0 ? "border-t" : ""}`}
          >
            <span className="w-9 text-[13px] font-medium text-[var(--home)]">{d.weekday}</span>
            <Sky icon={d.icon} size={22} />
            <span className="w-10 text-[13px] tabular text-[var(--home)]">{d.temp_c}°</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(d.sun_hours / 11) * 100}%`,
                    background: "var(--solar)",
                  }}
                />
              </div>
            </div>
            <span className="w-12 text-right text-[11px] text-muted tabular">{d.sun_hours}h sun</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-[11px] text-muted">
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

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}
