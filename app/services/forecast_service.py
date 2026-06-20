"""Requirement 4 — weekly weather-based forecast.

The synthetic dataset is a fixed historical year with no future readings, so the
forecast is built from a **seasonal weather analog**: for each of the next seven
days we look up the matching calendar day in the household's own history and use
its outdoor temperature and solar yield as the expected conditions. This grounds
the outlook in real weather-driven behaviour for that home and time of year.

To swap in a live forecast later, fetch from ``settings.weather_api_base_url``
(Open-Meteo) using the household's city coordinates and map daily cloud cover /
radiation to ``expected_solar_kwh`` — the response shape below stays the same.
"""

from __future__ import annotations

from datetime import timedelta

from app.data import dataset
from app.data.dataset import STEP_HOURS
from app.schemas.common import LightStatus
from app.schemas.forecast import DailyForecast, WeeklyForecast


def _monthly_peak_pv(by_date: dict[str, list[dict]]) -> dict[str, float]:
    """Best single-day PV kWh per calendar month — used to grade 'sunniness'."""
    peak: dict[str, float] = {}
    for d, recs in by_date.items():
        month = d[:7]
        pv = sum(r["pv_production_kw"] for r in recs) * STEP_HOURS
        peak[month] = max(peak.get(month, 0.0), pv)
    return peak


def _classify_weather(pv_kwh: float, peak: float, temp: float) -> str:
    ratio = pv_kwh / peak if peak else 0.0
    if ratio >= 0.65:
        sky = "Sunny"
    elif ratio >= 0.35:
        sky = "Partly cloudy"
    else:
        sky = "Overcast"
    feel = "cold" if temp < 5 else "mild" if temp < 18 else "warm"
    return f"{sky}, {feel} (~{temp:.0f}°C)"


class ForecastService:
    async def get_weekly(self, household_id: str) -> WeeklyForecast:
        """Seven-day outlook from the weather analog + system specs."""
        if dataset.get_household(household_id) is None:
            raise KeyError(household_id)

        by_date = dataset.records_by_date(household_id)
        # Index history by month-day so we can find each future day's analog.
        analog: dict[str, str] = {}
        for d in by_date:
            analog.setdefault(d[5:], d)
        peaks = _monthly_peak_pv(by_date)

        anchor = dataset.current_record(household_id)["_dt"]
        days: list[DailyForecast] = []
        good_days = 0
        total_solar = 0.0

        for i in range(1, 8):
            target = (anchor + timedelta(days=i)).date()
            key = target.strftime("%m-%d")
            src = analog.get(key) or analog.get("02-28")  # leap-day fallback
            recs = by_date[src]

            pv_kwh = sum(r["pv_production_kw"] for r in recs) * STEP_HOURS
            cons_kwh = sum(r["total_consumption_kw"] for r in recs) * STEP_HOURS
            avg_temp = sum(r["outdoor_temp_c"] for r in recs) / len(recs)
            total_solar += pv_kwh

            self_supply = min(1.0, pv_kwh / cons_kwh) if cons_kwh else 0.0
            if self_supply >= 0.6:
                outlook = LightStatus.GREEN
                good_days += 1
            elif self_supply >= 0.3:
                outlook = LightStatus.AMBER
            else:
                outlook = LightStatus.RED

            days.append(
                DailyForecast(
                    date=target.isoformat(),
                    weather_summary=_classify_weather(pv_kwh, peaks.get(src[:7], 0.0), avg_temp),
                    expected_solar_kwh=round(pv_kwh, 1),
                    outlook=outlook,
                    note=(
                        f"~{pv_kwh:.0f} kWh solar vs ~{cons_kwh:.0f} kWh use — "
                        f"about {self_supply * 100:.0f}% self-supplied."
                    ),
                )
            )

        return WeeklyForecast(
            household_id=household_id,
            days=days,
            summary=(
                f"~{total_solar:.0f} kWh of solar expected over the week, with "
                f"{good_days} strong self-supply day(s). "
                "Plan flexible loads (EV, laundry) for the sunniest days."
            ),
        )


forecast_service = ForecastService()
