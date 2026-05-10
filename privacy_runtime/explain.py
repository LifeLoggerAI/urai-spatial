"""User-facing privacy explanation helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .guard import PrivacyGuard


@dataclass(frozen=True)
class PrivacyExplanation:
    feature: str
    purpose: str
    source_categories: Sequence[str]
    policy_version: str
    user_rights: Sequence[str]


class ExplanationService:
    """Produces safe, plain-language explanations for mapped features."""

    def __init__(self, guard: PrivacyGuard):
        self.guard = guard

    def explain(
        self,
        *,
        feature: str,
        purpose: str,
        source_categories: Sequence[str],
        policy_version: str = "0.1.0-draft",
    ) -> PrivacyExplanation:
        self.guard.require_explanation_supported(feature)
        return PrivacyExplanation(
            feature=feature,
            purpose=purpose,
            source_categories=tuple(source_categories),
            policy_version=policy_version,
            user_rights=("export", "delete", "revoke_consent", "request_review"),
        )
