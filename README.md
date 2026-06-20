# Enpal — Home Energy Companion (Backend)

FastAPI backend for the hackathon challenge: turn a household's messy energy
reality (solar, battery, heat pump, EV, grid, dynamic tariff) into one clear,
intuitive, *actionable* view — with an AI layer on top.

This repo is a **boilerplate**. The structure, API surface, and data contracts
are in place; the feature logic is stubbed for the team to fill in. Every
endpoint is reachable and documented — unbuilt ones return `501 Not Implemented`.

## Quick start

```bash
# 1. Create & activate a virtual environment
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS/Linux:           source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env        # then add your ANTHROPIC_API_KEY

# 4. Run
uvicorn app.main:app --reload
```

Open **http://localhost:8000/docs** for interactive API docs.

```bash
# Run tests
pytest
```

## Project layout

```
app/
├── main.py            # FastAPI app, CORS, 501-handler, router mount
├── config.py          # settings from env (.env) — import `settings`
├── api/
│   ├── deps.py        # shared dependencies (household selection)
│   ├── router.py      # mounts all feature routers under /api/v1
│   └── routes/        # one router per requirement
├── schemas/           # Pydantic request/response models (the API contract)
├── services/          # business logic, one module per requirement
├── core/
│   ├── llm.py         # Anthropic Claude client wrapper (chatbot/insights)
│   └── notifications.py  # push-notification dispatch
└── data/
    └── mock_store.py  # synthetic/sample household data (swap for real later)
tests/                 # smoke tests
```

**Layering:** `routes → services → data/core`. Routes stay thin; logic lives in
services; services are the only callers of the data store and the LLM client.

## Requirements → where to build

Each requirement maps to a route + schema + service. Find the `NotImplementedError`
/ `TODO(team)` markers and fill them in.

| # | Requirement | Endpoint(s) | Code |
|---|-------------|-------------|------|
| 1 | Light indications per item + push on change | `GET /api/v1/lights`, `POST /api/v1/lights/evaluate` | `services/lights_service.py`, `core/notifications.py` |
| 2 | Money saved + monthly bill + 2-month comparison | `GET /api/v1/billing/comparison` | `services/billing_service.py` |
| 3 | Per-unit condition + weekly detail + feedback | `GET /api/v1/energy-units`, `GET /api/v1/energy-units/{unit}/weekly` | `services/energy_units_service.py` |
| 4 | Weekly weather-based forecast | `GET /api/v1/forecast/weekly` | `services/forecast_service.py` |
| 5 | Weekly money reduced + energy consumed (daily breakdown) | `GET /api/v1/consumption/weekly` | `services/consumption_service.py` |
| 6 | Chatbot (suggested questions + grounded answers) | `GET /api/v1/chat/suggested-questions`, `POST /api/v1/chat` | `services/chat_service.py`, `core/llm.py` |

## AI layer

`core/llm.py` wraps the Anthropic SDK (default model `claude-opus-4-8`, adaptive
thinking on). It's optional at boot — the server runs without a key; `/health`
reports `llm_enabled`. Build prompts and grounding context inside the services,
not in the wrapper.

## Conventions

- One feature = one route module + one schema module + one service module.
- Put shared types in `schemas/common.py`.
- Read config via `from app.config import settings` — never `os.environ` directly.
- Sample data lives only in `data/mock_store.py`; load the provided dataset there.
