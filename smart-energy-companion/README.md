# Enpal · Smart Energy Companion

Turns a household's messy energy reality — solar, battery, heat pump, EV, a dynamic
tariff and a contract nobody reads — into **one clear, plain-language view** that a
non-technical homeowner instantly understands.

Built for the Enpal **AI × Energy** track on the provided synthetic dataset
(4 German households, full-year 2025, 15-minute resolution).

## What it does

- **Unified energy view** — a live "what's happening now" hero showing solar → battery →
  grid → home flows, in plain words ("Solar is covering about 80% of your home right
  now; the rest comes from the grid"), plus a day chart of production vs. use vs. price.
- **Proactive insights & nudges** — detected anomalies (the February heat-pump fault),
  the cheapest hours today to run flexible loads, bill spikes, and savings vs. the
  alternative tariff.
- **Tariff intelligence** — estimates this year's cost on the current tariff vs. the
  alternative (dynamic ↔ fixed) and tells you which is the better deal.
- **Conversational companion** — ask "why was my bill high?", "should I charge the car
  now?", "is my contract a good deal?" and get a short, grounded answer that cites the
  household's real numbers.

## The AI layer

The chat is powered by Claude with **tool use**: the model reasons over the household's
data through typed tools (`get_current_status`, `get_today_summary`,
`get_cheapest_windows`, `get_monthly_bills`, `compare_tariffs`, `get_contract`, …) so
answers are always grounded in real figures, never invented. Those same functions feed
the dashboard, so the UI and the assistant share one source of truth.

### Enabling Claude

```bash
cp .env.local.example .env.local   # then paste your ANTHROPIC_API_KEY
```

Without a key the app runs a **deterministic, data-grounded fallback** (same data, no
LLM) so the demo works fully offline. Drop in a key and the assistant becomes live —
no other changes needed.

## Run it

```bash
npm install
npm run dev
# http://localhost:3000   (switch households with the chips in the header)
```

## Architecture

```
src/lib/data.ts      loaders + aggregations over the dataset (snapshot, day/year
                     summaries, cheapest windows, tariff comparison) — the source of truth
src/lib/tools.ts     Claude tool schemas + executor + system prompt
src/lib/fallback.ts  deterministic answers when no API key is present
src/app/api/chat     tool-use loop (Claude) with graceful fallback
src/components/*      EnergyFlow, DayChart, StatCards, Insights, Chat, HouseholdSwitcher
data/*.json          the synthetic dataset
```

All values are synthetic, for hackathon use only.
