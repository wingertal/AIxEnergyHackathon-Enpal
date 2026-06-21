"""Requirement 1 — light indications + push on change."""

from __future__ import annotations

from app.core.notifications import PushNotification, notification_service
from app.data import dataset
from app.schemas.common import EnergyUnitType, LightStatus
from app.schemas.lights import ItemLight, LightChangeEvent, LightsOverview
from app.services.analytics import (
    UNIT_LABELS,
    evaluate_light,
    units_for_household,
)


def _lights_at(household_id: str, rec: dict, day_records: list[dict]) -> list[ItemLight]:
    """Compute every item's light for a given reading."""
    items: list[ItemLight] = []
    for unit in units_for_household(household_id):
        status, power_w, message = evaluate_light(unit, household_id, rec, day_records)
        items.append(
            ItemLight(
                unit=unit,
                label=UNIT_LABELS[unit],
                status=status,
                consumption_w=round(power_w, 1),
                message=message,
            )
        )
    return items


class LightsService:
    async def get_overview(self, household_id: str) -> LightsOverview:
        """Current traffic-light + consumption for every household item."""
        if dataset.get_household(household_id) is None:
            raise KeyError(household_id)
        rec = dataset.current_record(household_id)
        day_records = dataset.records_by_date(household_id)[rec["_date"]]
        return LightsOverview(
            household_id=household_id,
            items=_lights_at(household_id, rec, day_records),
        )

    async def evaluate_and_notify(self, household_id: str) -> list[LightChangeEvent]:
        """Recompute lights, and push a notification for any that changed.

        Compares the latest reading against the reading ~12 hours earlier (which
        captures the day→night swing) and emits a change event — with a push —
        for every unit whose light flipped. In production the baseline would be
        the last polled state rather than a fixed offset.
        """
        if dataset.get_household(household_id) is None:
            raise KeyError(household_id)
        records = dataset.load_timeseries(household_id)
        now = records[-1]
        prev = records[-49] if len(records) >= 49 else records[0]  # ~12 hours earlier

        now_day = dataset.records_by_date(household_id)[now["_date"]]
        prev_day = dataset.records_by_date(household_id)[prev["_date"]]

        now_lights = {i.unit: i for i in _lights_at(household_id, now, now_day)}
        prev_lights = {i.unit: i for i in _lights_at(household_id, prev, prev_day)}

        events: list[LightChangeEvent] = []
        for unit, light in now_lights.items():
            previous = prev_lights.get(unit)
            if previous is None or previous.status == light.status:
                continue
            event = LightChangeEvent(
                household_id=household_id,
                unit=unit,
                previous=previous.status,
                current=light.status,
                message=self._change_message(unit, previous.status, light.status, light.message),
            )
            events.append(event)
            await notification_service.send(
                household_id,
                PushNotification(
                    title=f"{light.label}: {previous.status.value} → {light.status.value}",
                    body=event.message,
                    data={"unit": unit.value, "status": light.status.value},
                ),
            )
        return events

    @staticmethod
    def _change_message(
        unit: EnergyUnitType, prev: LightStatus, curr: LightStatus, detail: str | None
    ) -> str:
        label = UNIT_LABELS[unit]
        direction = "improved" if _rank(curr) < _rank(prev) else "needs attention"
        base = f"{label} {direction} ({prev.value} → {curr.value})."
        return f"{base} {detail}" if detail else base


def _rank(status: LightStatus) -> int:
    return {LightStatus.GREEN: 0, LightStatus.AMBER: 1, LightStatus.RED: 2}[status]


lights_service = LightsService()
