"""Audit sink utilities for URAI Spatial privacy runtime."""

from __future__ import annotations

from dataclasses import asdict
from typing import Iterable, List

from .guard import AuditEvent


class InMemoryAuditSink:
    """Simple append-only audit sink for tests and local adapters.

    Production adapters should persist the same event shape into the selected
    audit-log store with append-only permissions.
    """

    def __init__(self):
        self._events: List[AuditEvent] = []

    def append(self, event: AuditEvent) -> AuditEvent:
        self._events.append(event)
        return event

    def extend(self, events: Iterable[AuditEvent]) -> None:
        for event in events:
            self.append(event)

    def all(self) -> List[AuditEvent]:
        return list(self._events)

    def for_user(self, user_id: str) -> List[AuditEvent]:
        return [event for event in self._events if event.user_id == user_id]

    def for_feature(self, feature: str) -> List[AuditEvent]:
        return [event for event in self._events if event.feature == feature]

    def as_dicts(self) -> List[dict]:
        return [asdict(event) for event in self._events]
