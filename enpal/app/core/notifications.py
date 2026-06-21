"""Push notification dispatch (Requirement 1: notify when a 'light' changes).

Boilerplate only. Today it logs the notification; swap `_deliver` for a real
provider (Firebase Cloud Messaging, Web Push, APNs, ...) when wiring up devices.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger("enpal.notifications")


@dataclass(slots=True)
class PushNotification:
    title: str
    body: str
    # Free-form payload the client app can act on (e.g. {"unit": "battery"}).
    data: dict | None = None


class NotificationService:
    """Sends push notifications to a household's devices."""

    async def send(self, household_id: str, notification: PushNotification) -> None:
        """Deliver a notification to all devices for a household.

        TODO(team): look up device tokens for `household_id` and deliver via the
        chosen push provider. For now this just logs.
        """
        await self._deliver(household_id, notification)

    async def _deliver(self, household_id: str, notification: PushNotification) -> None:
        logger.info(
            "PUSH -> household=%s title=%r body=%r data=%s",
            household_id,
            notification.title,
            notification.body,
            notification.data,
        )


notification_service = NotificationService()
