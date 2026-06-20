"""Feature tests for the implemented requirements (1-5; chat excluded).

These run against the real synthetic dataset, exercising the actual calculations
end-to-end through the API.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

HH = "HH-1001"  # full system: PV + battery + heat pump + EV (dynamic tariff)


# --- Requirement 1: lights -------------------------------------------------


def test_lights_overview():
    res = client.get(f"/api/v1/lights?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert body["household_id"] == HH
    units = {i["unit"] for i in body["items"]}
    # Full household exposes every unit type.
    assert {"solar", "battery", "heat_pump", "ev_charger", "grid", "home"} <= units
    for item in body["items"]:
        assert item["status"] in {"green", "amber", "red"}
        assert item["consumption_w"] is not None


def test_lights_evaluate_returns_change_events():
    res = client.post(f"/api/v1/lights/evaluate?household_id={HH}")
    assert res.status_code == 200
    for event in res.json():
        assert event["previous"] != event["current"]


def test_household_without_battery_omits_it():
    res = client.get("/api/v1/lights?household_id=HH-1004")  # no battery/HP/EV
    assert res.status_code == 200
    units = {i["unit"] for i in res.json()["items"]}
    assert "battery" not in units
    assert "solar" in units and "grid" in units


# --- Requirement 2: billing ------------------------------------------------


def test_billing_comparison():
    res = client.get(f"/api/v1/billing/comparison?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert body["current"]["month"] == "2025-12"
    assert len(body["previous_months"]) == 2
    assert body["previous_months"][0]["month"] == "2025-11"
    assert body["savings_trend"] in {"up", "down", "flat"}
    assert body["current"]["saved"]["amount"] > 0  # solar saves money
    assert body["verdict"]


# --- Requirement 3: energy units -------------------------------------------


def test_energy_unit_conditions():
    res = client.get(f"/api/v1/energy-units?household_id={HH}")
    assert res.status_code == 200
    units = res.json()["units"]
    battery = next(u for u in units if u["unit"] == "battery")
    assert "soc_pct" in battery["metrics"]


def test_unit_weekly_detail():
    res = client.get(f"/api/v1/energy-units/solar/weekly?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert body["unit"] == "solar"
    assert body["unit_of_measure"] == "kWh"
    assert len(body["series"]) == 7
    assert body["feedback"]


def test_unit_weekly_detail_absent_unit_404():
    res = client.get("/api/v1/energy-units/battery/weekly?household_id=HH-1004")
    assert res.status_code == 404


# --- Requirement 4: forecast -----------------------------------------------


def test_weekly_forecast():
    res = client.get(f"/api/v1/forecast/weekly?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert len(body["days"]) == 7
    for day in body["days"]:
        assert day["outlook"] in {"green", "amber", "red"}
        assert day["expected_solar_kwh"] is not None
    assert body["summary"]


# --- Requirement 5: weekly consumption -------------------------------------


def test_weekly_consumption():
    res = client.get(f"/api/v1/consumption/weekly?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert len(body["daily"]) == 7
    assert body["total_energy_consumed_kwh"] > 0
    # Daily totals should sum to the reported total.
    daily_sum = sum(d["energy_consumed_kwh"] for d in body["daily"])
    assert abs(daily_sum - body["total_energy_consumed_kwh"]) < 0.5


# --- Cross-cutting ---------------------------------------------------------


def test_unknown_household_404():
    res = client.get("/api/v1/billing/comparison?household_id=HH-9999")
    assert res.status_code == 404
