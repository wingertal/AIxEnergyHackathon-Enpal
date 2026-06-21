# Smart Energy Companion

> **Enpal Hackathon 2025** — an AI-powered home energy dashboard that turns raw smart-meter data into clear, personalised guidance for every household.

The app gives homeowners one intuitive view of their energy reality: what their solar, battery, heat pump and EV charger are doing right now, what it costs, and exactly what to do next — explained in plain language by an AI companion that knows their home.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Architecture overview](#architecture-overview)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Setup and installation](#setup-and-installation)
6. [Environment variables](#environment-variables)
7. [API reference](#api-reference)
8. [Calculation strategies](#calculation-strategies)
9. [Demo households](#demo-households)

---

## What it does

| Feature | Detail |
|---|---|
| **Energy health status** | Derives a `great / warning / high alert` level from real-time consumption vs. historical p95, self-sufficiency rate, active anomalies, and current price tier |
| **Live snapshot** | Grid import/export, solar production, battery state-of-charge, and per-device power — all from the most recent 15-minute reading |
| **Savings card** | Today's spend, projected monthly bill, solar savings, and feed-in earnings; trend pill compares against last month |
| **Per-device economics** | Money saved (solar, battery) or cost incurred (heat pump, EV) for today and this calendar month |
| **Smart tariff advice** | Detects fixed vs. dynamic tariff; shows cheapest upcoming hours for dynamic households; shows a flat-rate explanation for fixed-price contracts |
| **AI recommendations** | OpenAI `gpt-4o-mini` generates 4–7 personalised tips grounded in the household's own numbers — falls back to a deterministic engine when no key is available |
| **AI companion chat** | Household-aware conversational assistant with profile-derived suggested questions, persisted conversation history, and a keyword-matching offline fallback |
| **Demo states** | Three households covering all health states: all-good, warning (medium anomaly), and high-alert (severe anomaly) |

---

## Architecture overview

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│   Next.js 16 (port 3000)    │        │      FastAPI / Uvicorn (port 8000)   │
│                             │        │                                      │
│  Server Components fetch    │◄──────►│  /api/v1/data/*   raw dataset files  │
│  all data from the API at   │        │  /api/v1/chat     AI companion       │
│  build / request time.      │        │  /api/v1/chat/suggested-questions    │
│                             │        │  /api/v1/chat/conversations          │
│  OpenAI (gpt-4o-mini)       │        │                                      │
│  called server-side for     │        │  SQLite (SQLAlchemy)                 │
│  personalised tips.         │        │  conversation history per household  │
└─────────────────────────────┘        └──────────────────────────────────────┘
```

The FastAPI server is the **single source of truth** for all dataset files.  The Next.js layer fetches raw JSON over HTTP, then runs all derived computations in TypeScript — no data transformation happens in Python, keeping the two sides independently testable.

Chat answers flow through the FastAPI backend (which calls OpenAI), keeping the API key server-side only.  The frontend proxies chat messages to `/api/chat` which forwards them to the enpal server.

---

## Tech stack

### Backend (`enpal/`)

| Layer | Technology |
|---|---|
| Web framework | **FastAPI** 0.115 + **Uvicorn** |
| Validation | **Pydantic v2** + pydantic-settings |
| AI — chat | **OpenAI SDK** ≥1.3 (`gpt-4o-mini`) |
| Database | **SQLite** via **SQLAlchemy** 2.0 |
| Testing | **pytest** + pytest-asyncio |

### Frontend (`smart-energy-companion/`)

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.9** (App Router, Server Components) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS v4** |
| AI — recommendations | **OpenAI SDK** 6 (server-side only) |
| Rendering | React 19 |

---

## Project structure

```
hackathon/
├── enpal/                          # FastAPI backend
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── data.py             # Serves raw dataset files over HTTP
│   │   │   └── chat.py             # Conversational AI + suggested questions
│   │   ├── core/
│   │   │   └── openai_client.py    # Singleton OpenAI wrapper with fallback
│   │   ├── data/
│   │   │   └── dataset.py          # Low-level dataset file helpers
│   │   ├── models/
│   │   │   └── chat.py             # Conversation + Message ORM models
│   │   ├── services/
│   │   │   ├── chat_service.py     # Grounding, system prompt, fallback logic
│   │   │   ├── conversation_store.py  # CRUD for persisted conversations
│   │   │   └── analytics.py        # Daily cost breakdowns
│   │   ├── schemas/chat.py         # Pydantic schemas for chat endpoints
│   │   ├── config.py               # Settings (loaded from .env)
│   │   ├── db.py                   # SQLAlchemy engine + session factory
│   │   └── main.py                 # FastAPI app, CORS, startup
│   ├── scripts/
│   │   └── gen_demo_households.py  # Generates HH-1005 (warning) + HH-1006 (alert)
│   └── requirements.txt
│
└── smart-energy-companion/         # Next.js frontend
    └── src/
        ├── app/
        │   ├── page.tsx            # Root server component; fetches + computes all data
        │   ├── api/chat/route.ts   # Proxy: frontend → enpal backend
        │   └── globals.css         # Design tokens (Enpal palette, card utilities)
        ├── lib/
        │   ├── data.ts             # All energy computations (1 000+ lines)
        │   └── recommend.ts        # OpenAI-powered recommendations with fallback
        └── components/app/
            ├── AppShell.tsx        # Mobile layout
            ├── WebShell.tsx        # Desktop layout
            ├── AskScreen.tsx       # Chat overlay
            └── icons.tsx           # Device icons + health colour system
```

---

## Setup and installation

### Prerequisites

- **Python 3.11+**
- **Node.js 20+** and **npm**
- An **OpenAI API key** (the app works without one — AI features fall back gracefully)

---

### 1. Clone the repository

```bash
git clone <repository-url>
cd hackathon
```

---

### 2. Backend setup

```bash
cd enpal

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create the environment file:

```bash
# enpal/.env   (copy from enpal/.env.example)
OPENAI_API_KEY=sk-...          # your OpenAI key (optional but recommended)
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:///./enpal_chat.db
```

> The host and port are passed to `uvicorn` on the command line (see below), not via `.env`.

Generate the two demo households that showcase warning and high-alert states:

```bash
python scripts/gen_demo_households.py
```

Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend setup

```bash
cd smart-energy-companion

npm install
```

Create the environment file:

```bash
# smart-energy-companion/.env.local   (copy from .env.local.example)
ENPAL_API_URL=http://localhost:8000/api/v1
OPENAI_API_KEY=sk-...          # same key, used server-side for AI recommendations
OPENAI_MODEL=gpt-4o-mini
```

> Both values are optional for local dev: `ENPAL_API_URL` defaults to `http://localhost:8000/api/v1`, and without `OPENAI_API_KEY` the recommendations fall back to the deterministic engine. The chat companion needs no key here, it is served by the backend.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** `npm run dev` uses `--webpack` to avoid a Turbopack incompatibility on Windows. Use `npm run dev:turbo` if you prefer Turbopack on macOS/Linux.

---

### 4. Switch households

The household selector in the app header switches between every household in the dataset. Notable ones for the demo:

| ID | Name | Health state |
|---|---|---|
| HH-1001 | Default household (full system) | All good |
| HH-1003 | Fixed-tariff household | All good (flat rate) |
| HH-1005 | Familie Wagner, Stuttgart | Warning |
| HH-1006 | Familie Hoffmann, Frankfurt | High alert |

---

## Environment variables

### Backend (`enpal/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | OpenAI key for the chat companion. Omit to use the offline fallback. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for chat completions |
| `DATABASE_URL` | `sqlite:///./enpal_chat.db` | SQLAlchemy database URL |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed frontend origins |

### Frontend (`smart-energy-companion/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `ENPAL_API_URL` | `http://localhost:8000/api/v1` | Base URL of the FastAPI backend |
| `OPENAI_API_KEY` | — | Server-side key for AI recommendations card |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for recommendations |

---

## API reference

All endpoints are under `/api/v1`. The interactive Swagger UI is at [http://localhost:8000/docs](http://localhost:8000/docs).

### Data endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/data/{name}` | Return a named dataset file as JSON (households, tariffs, contracts, …) |
| `GET` | `/data/timeseries/{household_id}` | Stream the full 15-minute time-series for a household |

### Chat endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/chat/suggested-questions?household_id=HH-1001` | Profile-derived suggested questions |
| `POST` | `/chat` | Send a message; returns a grounded AI answer + `conversation_id` |
| `GET` | `/chat/conversations?household_id=HH-1001` | List past conversations |
| `GET` | `/chat/conversations/{id}/messages` | Full message history for a conversation |

**POST `/chat` request body:**

```json
{
  "household_id": "HH-1001",
  "message": "When is the cheapest time to run my dishwasher today?",
  "conversation_id": null
}
```

**Response:**

```json
{
  "reply": "Right now power is around €0.24/kWh. The cheapest window today is 16:00 (~€0.19/kWh), a good slot for the dishwasher or laundry.",
  "conversation_id": 3
}
```

---

## Calculation strategies

All energy and financial computations live in `smart-energy-companion/src/lib/data.ts`. The backend only serves raw time-series data; the frontend performs all derived calculations.

### Energy health

Three signals are combined into a single `great / warning / high alert` level:

1. **Load anomaly** — current consumption vs. the 95th percentile (p95) of all historical 15-minute readings for that household. Exceeding p95 is a warning; exceeding 1.4× p95 with low self-sufficiency is a high alert.
2. **Self-sufficiency rate** — `solar_kwh / total_consumption_kwh` for today. Below 20% on a sunny day can contribute a warning.
3. **Active anomalies** — events flagged in the `insights` dataset within the current date range. High-severity anomalies immediately elevate to high alert.

### Cost and savings

- **Grid cost** — each 15-minute record carries a `price_eur_per_kwh` field. Actual cost = `grid_import_kw × 0.25h × price`.
- **Solar savings** — the counterfactual cost at the same price if all consumed energy had come from the grid, minus what was actually paid for grid imports.
- **Feed-in earnings** — `grid_export_kw × 0.25h × feed_in_eur_per_kwh` from the household's tariff.
- **Monthly projection** — linear extrapolation: `(cost_so_far / elapsed_days) × days_in_month`.

### Per-device economics

| Device | Today earned/saved | Monthly |
|---|---|---|
| Solar panels | Solar generation × avoided grid cost | Same, over full calendar month |
| Battery | Discharge energy × current price (avoided grid import) | Same |
| Heat pump | Energy consumed × grid price at time of use | Same |
| EV charger | Energy drawn × grid price at time of use | Same |

### Tariff detection

If every hour in the day's price window is identical, the household is on a **fixed tariff**. The UI then shows a single flat rate ("same price all day, run appliances whenever suits you") instead of meaningless identical cheapest-hour slots.

For **dynamic tariffs**, the cheapest upcoming 3 hours are surfaced by averaging the spot price across each future hour and sorting ascending.

### AI recommendations grounding

A JSON snapshot of the household's computed state (health, bill trend, equipment economics, anomalies, tariff, week outlook) is sent to `gpt-4o-mini` as the user-turn context. The system prompt instructs the model to cite only the provided numbers and to surface any active anomalies as high-priority warnings. The deterministic fallback uses the same snapshot with keyword matching — ensuring the app always produces useful output even without an API key.

---

## Demo households

Run `python scripts/gen_demo_households.py` to generate two synthetic households that demonstrate the warning and high-alert states:

| Household | Family | City | Anomaly | Health state |
|---|---|---|---|---|
| HH-1005 | Familie Wagner | Stuttgart | Medium — heat pump drawing 25% above normal | **Warning** |
| HH-1006 | Familie Hoffmann | Frankfurt | High severity — heat pump fault, 2.2× normal draw | **High alert** |

Both households clone a real household's base time-series and inject an anomaly over the week of 2025-06-16 to 2025-06-22 (the demo's reference week).

---

## License

Released under the **MIT License** for the Enpal Hackathon. See [LICENSE](LICENSE).
