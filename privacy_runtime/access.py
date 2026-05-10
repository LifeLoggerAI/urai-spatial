"""Least-privilege access checks for privacy operations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Iterable


SENSITIVE_FEATURES = frozenset({
    "generate-insights",
    "score-relationship-signals",
    "voice-events",
    "behavior-signals",
    "locations",
    "emotion-logs",
    "dream-logs",
    "relationships",
    "companion-state",
})


@dataclass(frozen=True)
class AccessActor:
    actor_id: str
    roles: FrozenSet[str]

    @classmethod
    def from_roles(cls, actor_id: str, roles: Iterable[str]) -> "AccessActor":
        return cls(actor_id=actor_id, roles=frozenset(roles))


class PrivacyAccessController:
    """Role-based privacy access controller.

    The default posture is deny. Sensitive feature access requires a privacy
    operator role, not generic support.
    """

    def can_process_request(self, actor: AccessActor) -> bool:
        return bool(actor.roles & {"privacy_operator", "privacy_admin"})

    def can_view_feature(self, actor: AccessActor, feature: str) -> bool:
        if "privacy_admin" in actor.roles:
            return True
        if feature in SENSITIVE_FEATURES:
            return "privacy_operator" in actor.roles
        return bool(actor.roles & {"privacy_operator", "support_operator"})

    def require_view_feature(self, actor: AccessActor, feature: str) -> None:
        if not self.can_view_feature(actor, feature):
            raise PermissionError(f"Actor {actor.actor_id} cannot view privacy feature {feature}")

    def require_process_request(self, actor: AccessActor) -> None:
        if not self.can_process_request(actor):
            raise PermissionError(f"Actor {actor.actor_id} cannot process privacy requests")
