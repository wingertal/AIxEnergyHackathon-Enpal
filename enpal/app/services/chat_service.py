"""Requirement 6, conversational assistant grounded in household data.

Merges the standalone OpenAI chatbot into the unified server and makes it
household-aware:

  * suggested questions are derived from THIS household's profile (assets,
    tariff, anomalies, bills) plus a few commonly-asked ones, and
  * answers are grounded in THIS household's real, computed energy data.

Conversations are persisted (see :mod:`app.services.conversation_store`). When no
OPENAI_API_KEY is configured, a deterministic, data-grounded fallback keeps the
assistant fully functional offline.
"""

from __future__ import annotations

import json

from app.core.openai_client import openai_client
from app.data import dataset
from app.db import SessionLocal
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SuggestedQuestion,
    SuggestedQuestions,
)
from app.services.analytics import daily_sum, day_cost_breakdown
from app.services.conversation_store import conversation_store

# The app anchors a fixed "now" so the demo always shows an interesting
# summer-midday moment (matches the frontend's REFERENCE_NOW).
REFERENCE_NOW = "2025-06-20T13:00:00"


# --- grounding -------------------------------------------------------------


def _ref_record(household_id: str) -> dict:
    """The reading at-or-just-before the demo's reference "now"."""
    day = dataset.records_by_date(household_id).get(REFERENCE_NOW[:10], [])
    if not day:
        return dataset.current_record(household_id)
    chosen = day[0]
    for r in day:
        if r["timestamp"] <= REFERENCE_NOW:
            chosen = r
        else:
            break
    return chosen


def _active_anomalies(household_id: str) -> list[dict]:
    date = REFERENCE_NOW[:10]
    out = []
    for e in dataset.get_insights(household_id):
        if e.get("type") != "anomaly":
            continue
        period = e.get("period", "")
        if ".." in period:
            start, end = period.split("..")
            if start <= date <= end:
                out.append(e)
    return out


def _cheapest_windows(household_id: str, count: int = 3) -> list[dict]:
    day = dataset.records_by_date(household_id).get(REFERENCE_NOW[:10], [])
    by_hour: dict[str, list[float]] = {}
    for r in day:
        if r["timestamp"] < REFERENCE_NOW:
            continue
        by_hour.setdefault(r["timestamp"][11:13], []).append(r["price_eur_per_kwh"])
    ranked = sorted(
        ({"time": f"{hh}:00", "price": round(sum(p) / len(p), 4)} for hh, p in by_hour.items()),
        key=lambda w: w["price"],
    )
    return ranked[:count]


def build_grounding(household_id: str) -> dict:
    """A compact, real snapshot of THIS household used to ground every answer."""
    h = dataset.get_household(household_id)
    if h is None:
        raise KeyError(household_id)
    contract = dataset.get_contract(household_id) or {}
    tariff = dataset.get_tariff_for_household(household_id) or {}
    rec = _ref_record(household_id)
    day = dataset.records_by_date(household_id).get(REFERENCE_NOW[:10], [])
    cost = day_cost_breakdown(household_id, day) if day else {}

    bills = dataset.get_bills(household_id)
    month = REFERENCE_NOW[:7]
    bill = next((b for b in bills if b["month"] == month), bills[-1] if bills else {})
    highest = max(bills, key=lambda b: b["total_bill_eur"]) if bills else {}
    lowest = min(bills, key=lambda b: b["total_bill_eur"]) if bills else {}

    return {
        "now": REFERENCE_NOW,
        "household": {
            "name": h["name"],
            "city": h["city"],
            "residents": h.get("residents"),
            "pv_kwp": h.get("pv_kwp"),
            "battery_kwh": h.get("battery_kwh"),
            "heat_pump": h.get("heat_pump"),
            "ev_charger": h.get("ev_charger"),
            "tariff_id": h.get("tariff_id"),
        },
        "contract": {
            "provider": contract.get("provider"),
            "tariff_name": contract.get("tariff_name"),
            "contract_end": contract.get("contract_end"),
            "minimum_term_months": contract.get("minimum_term_months"),
            "notice_period_weeks": contract.get("notice_period_weeks"),
            "auto_renew_months": contract.get("auto_renew_months"),
            "base_fee_eur_per_month": contract.get("base_fee_eur_per_month"),
            "feed_in_eur_per_kwh": contract.get("feed_in_eur_per_kwh"),
        },
        "tariff": {
            "type": tariff.get("type"),
            "energy_rate_eur_per_kwh": tariff.get("energy_rate_eur_per_kwh"),
            "spot_adder_eur_per_kwh": tariff.get("spot_adder_eur_per_kwh"),
        },
        "live_now": {
            "pv_production_kw": rec.get("pv_production_kw"),
            "total_consumption_kw": rec.get("total_consumption_kw"),
            "heatpump_kw": rec.get("heatpump_kw"),
            "ev_charging_kw": rec.get("ev_charging_kw"),
            "battery_soc_pct": rec.get("battery_soc_pct"),
            "grid_import_kw": rec.get("grid_import_kw"),
            "grid_export_kw": rec.get("grid_export_kw"),
            "price_eur_per_kwh": rec.get("price_eur_per_kwh"),
        },
        "today": {
            "pv_kwh": round(daily_sum(day, "pv_production_kw"), 1) if day else 0,
            "consumption_kwh": round(cost.get("consumption_kwh", 0), 1),
            "grid_import_kwh": round(daily_sum(day, "grid_import_kw"), 1) if day else 0,
            "cost_eur": round(cost.get("actual", 0), 2),
            "saved_vs_no_solar_eur": round(cost.get("saved", 0), 2),
        },
        "this_month_bill": bill,
        "highest_month": {
            "month": highest.get("month"),
            "total_bill_eur": highest.get("total_bill_eur"),
        },
        "lowest_month": {
            "month": lowest.get("month"),
            "total_bill_eur": lowest.get("total_bill_eur"),
        },
        "cheapest_windows_today": _cheapest_windows(household_id, 3),
        "active_anomalies": [
            {
                "title": a.get("title"),
                "detail": a.get("detail"),
                "suggested_action": a.get("suggested_action"),
            }
            for a in _active_anomalies(household_id)
        ],
    }


def _system_prompt(grounding: dict) -> str:
    h = grounding["household"]
    assets = []
    if h.get("pv_kwp"):
        assets.append(f"{h['pv_kwp']} kWp solar")
    assets.append(f"a {h['battery_kwh']} kWh battery" if h.get("battery_kwh") else "no home battery")
    assets.append("a heat pump" if h.get("heat_pump") else "no heat pump")
    assets.append("an EV charger" if h.get("ev_charger") else "no EV charger")
    return (
        "You are the Enpal Smart Energy Companion, a warm, plain-spoken assistant for a "
        f"non-technical homeowner. You are helping {h['name']} in {h['city']}. Their home has: "
        f"{', '.join(assets)}, on the {h['tariff_id']} tariff.\n\n"
        "Rules:\n"
        "- Ground EVERY answer in the JSON data provided below. Never invent figures.\n"
        f"- Treat the present moment as {grounding['now']} (today is 2025-06-20, 13:00).\n"
        "- Plain language a non-expert understands; briefly anchor units (kWh ≈ a load of laundry).\n"
        "- Be concise (2-4 short sentences or a tight list) and actionable. Money is in euros (€).\n"
        "- Use commas or periods for punctuation; never use em dashes or en dashes.\n\n"
        "HOUSEHOLD DATA (JSON):\n" + json.dumps(grounding, ensure_ascii=False)
    )


# --- deterministic fallback (no OPENAI_API_KEY) ----------------------------


def _fallback_answer(grounding: dict, question: str) -> str:
    q = question.lower()
    g = grounding
    win = g["cheapest_windows_today"]
    win_txt = ", ".join(f"{w['time']} (~€{w['price']:.2f}/kWh)" for w in win) or "later today"

    if g["active_anomalies"] and any(
        k in q for k in ("heat pump", "heatpump", "anomaly", "wrong", "high")
    ):
        a = g["active_anomalies"][0]
        return f"{a['title']}. {a.get('detail', '')} Suggested: {a.get('suggested_action', 'book a service check')}."

    if any(k in q for k in ("now", "charge", "dishwasher", "laundry", "cheap", "best time", "when")):
        price = g["live_now"].get("price_eur_per_kwh") or 0
        return (
            f"Right now power is about €{price:.2f}/kWh. The cheapest upcoming hours today are around "
            f"{win_txt}, shift flexible loads (EV, dishwasher, laundry) into those windows to save."
        )

    if any(k in q for k in ("bill", "cost", "expensive", "spend", "pay")):
        hi, lo = g["highest_month"], g["lowest_month"]
        b = g["this_month_bill"]
        return (
            f"This month ({b.get('month')}) is tracking around €{b.get('total_bill_eur', '?')}. "
            f"Your highest month was {hi.get('month')} (€{hi.get('total_bill_eur')}) and lowest "
            f"{lo.get('month')} (€{lo.get('total_bill_eur')}), high months come from more heating and less solar."
        )

    if any(k in q for k in ("contract", "tariff", "switch", "deal", "cancel", "renew", "term")):
        c = g["contract"]
        return (
            f"You're on {c.get('tariff_name')} with {c.get('provider')}, running until {c.get('contract_end')} "
            f"(min term {c.get('minimum_term_months')} months, {c.get('notice_period_weeks')} weeks' notice; "
            f"otherwise it auto-renews for {c.get('auto_renew_months')} months)."
        )

    if any(k in q for k in ("solar", "save", "saving", "battery", "self")):
        t = g["today"]
        return (
            f"Today your solar produced about {t['pv_kwh']} kWh and you saved roughly €{t['saved_vs_no_solar_eur']} "
            "versus buying everything from the grid. Using your own solar is worth far more than exporting it."
        )

    ln = g["live_now"]
    return (
        f"Right now you're using {ln.get('total_consumption_kw')} kW, with solar making "
        f"{ln.get('pv_production_kw')} kW. Ask me about your bill, your contract, your solar, or the best time "
        "to run appliances."
    )


# --- popular questions -----------------------------------------------------

_POPULAR = [
    ("pop-bill", "Why was my bill high this month?"),
    ("pop-save", "How can I save more energy?"),
    ("pop-cheapest", "When is electricity cheapest today?"),
]


class ChatService:
    def __init__(self) -> None:
        self._llm = openai_client

    async def get_suggested_questions(self, household_id: str) -> SuggestedQuestions:
        """Pre-defined prompts derived from THIS household's profile + popular ones."""
        h = dataset.get_household(household_id)
        if h is None:
            raise KeyError(household_id)

        profile: list[SuggestedQuestion] = []

        def add(qid: str, text: str) -> None:
            profile.append(SuggestedQuestion(id=qid, text=text, source="profile"))

        anomalies = _active_anomalies(household_id)
        hp_anomaly = any("heat pump" in (a.get("title", "").lower()) for a in anomalies)

        if h.get("heat_pump") and hp_anomaly:
            add("hp-anomaly", "Why is my heat pump using more power than usual?")
        if h.get("pv_kwp", 0) > 0:
            add("solar-savings", "How much did my solar save me this month?")
        if h.get("battery_kwh", 0) > 0:
            add("battery-status", "How is my home battery doing today?")
        else:
            add("battery-worth", "Would a home battery be worth it for me?")
        if h.get("ev_charger"):
            add("ev-charge", "When's the cheapest time to charge my car today?")
        if h.get("heat_pump") and not hp_anomaly:
            add("heating-costs", "How can I cut my heating costs?")
        if h.get("tariff_id") == "dynamic":
            add("cheapest-now", "When is electricity cheapest today?")
        else:
            add("tariff-check", "Am I on the best tariff for my home?")

        # Fill out with popular questions (skipping any already covered).
        seen = {q.text.lower() for q in profile}
        popular = [
            SuggestedQuestion(id=qid, text=text, source="popular")
            for qid, text in _POPULAR
            if text.lower() not in seen
        ]

        return SuggestedQuestions(household_id=household_id, questions=[*profile, *popular])

    async def answer(self, request: ChatRequest) -> ChatResponse:
        """Answer a question grounded in the household's own energy data (persisted)."""
        grounding = build_grounding(request.household_id)  # raises KeyError if unknown
        db = SessionLocal()
        try:
            conv_id = request.conversation_id
            if conv_id is None:
                conv = conversation_store.create(
                    db, request.household_id, title=request.message[:60]
                )
                conv_id = conv.id
                # Seed any prior turns a stateless client sent.
                for m in request.history:
                    conversation_store.add_message(db, conv_id, m.role, m.content)
            conversation_store.add_message(db, conv_id, "user", request.message)

            msgs = [
                {"role": m.role, "content": m.content}
                for m in conversation_store.get_messages(db, conv_id)
            ]

            reply = self._generate(grounding, msgs)
            conversation_store.add_message(db, conv_id, "assistant", reply)
            return ChatResponse(reply=reply, conversation_id=conv_id)
        finally:
            db.close()

    def _generate(self, grounding: dict, messages: list[dict]) -> str:
        if self._llm.enabled:
            try:
                return self._llm.complete(system=_system_prompt(grounding), messages=messages)
            except Exception:  # pragma: no cover - network/API errors -> fallback
                pass
        last_user = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        return _fallback_answer(grounding, last_user)


chat_service = ChatService()
