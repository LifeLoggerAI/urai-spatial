"""Dependency-free privacy runtime guard for URAI Spatial.

The guard provides a small policy enforcement layer that can be used by
backend handlers, jobs, or tests before sensitive processing occurs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Set
from uuid import uuid4


@dataclass(frozen=True)
class PrivacyManifest:
    """Runtime subset of a privacy feature manifest."""

    feature: str
    required_consent_tiers: Set[str]
    sensitive_inference: bool = False
    biometric_or_identity_linked: bool = False
    data_sharing: bool = False
    monetization: bool = False
    export_supported: bool = True
    deletion_supported: bool = True
    explanation_supported: bool = False


@dataclass(frozen=True)
class ConsentRecord:
    """Single consent grant/revocation record."""

    user_id: str
    scope: str
    granted: bool
    policy_version: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "runtime"


@dataclass
class ConsentState:
    """Current user consent state."""

    user_id: str
    granted_scopes: Set[str] = field(default_factory=set)
    revoked_scopes: Set[str] = field(default_factory=set)
    policy_version: str = "0.1.0-draft"

    def grant(self, scope: str) -> ConsentRecord:
        self.revoked_scopes.discard(scope)
        self.granted_scopes.add(scope)
        return ConsentRecord(
            user_id=self.user_id,
            scope=scope,
            granted=True,
            policy_version=self.policy_version,
        )

    def revoke(self, scope: str) -> ConsentRecord:
        self.granted_scopes.discard(scope)
        self.revoked_scopes.add(scope)
        return ConsentRecord(
            user_id=self.user_id,
            scope=scope,
            granted=False,
            policy_version=self.policy_version,
        )

    def has_scope(self, scope: str) -> bool:
        return scope in self.granted_scopes and scope not in self.revoked_scopes


@dataclass(frozen=True)
class AuditEvent:
    """Audit event emitted by privacy decisions."""

    event_id: str
    actor_id: str
    user_id: str
    action: str
    feature: str
    result: str
    policy_version: str
    reason: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class PrivacyDecision:
    """Allow/deny decision plus audit event."""

    allowed: bool
    feature: str
    reason: str
    missing_scopes: Set[str]
    audit_event: AuditEvent


class PrivacyGuard:
    """Evaluates runtime privacy decisions for feature processing."""

    def __init__(self, manifests: Iterable[PrivacyManifest]):
        self._manifests: Dict[str, PrivacyManifest] = {m.feature: m for m in manifests}

    def manifest(self, feature: str) -> PrivacyManifest:
        try:
            return self._manifests[feature]
        except KeyError as exc:
            raise KeyError(f"Unknown privacy feature manifest: {feature}") from exc

    def can_process(
        self,
        *,
        feature: str,
        consent_state: ConsentState,
        actor_id: Optional[str] = None,
    ) -> PrivacyDecision:
        manifest = self.manifest(feature)
        actor = actor_id or consent_state.user_id
        missing = {scope for scope in manifest.required_consent_tiers if not consent_state.has_scope(scope)}

        if missing:
            reason = "missing_or_revoked_consent"
            return self._decision(
                allowed=False,
                feature=feature,
                consent_state=consent_state,
                actor_id=actor,
                reason=reason,
                missing_scopes=missing,
            )

        if manifest.data_sharing and not consent_state.has_scope("C8"):
            return self._decision(
                allowed=False,
                feature=feature,
                consent_state=consent_state,
                actor_id=actor,
                reason="missing_data_sharing_opt_in",
                missing_scopes={"C8"},
            )

        if manifest.monetization and not consent_state.has_scope("C8"):
            return self._decision(
                allowed=False,
                feature=feature,
                consent_state=consent_state,
                actor_id=actor,
                reason="missing_monetization_opt_in",
                missing_scopes={"C8"},
            )

        return self._decision(
            allowed=True,
            feature=feature,
            consent_state=consent_state,
            actor_id=actor,
            reason="consent_valid",
            missing_scopes=set(),
        )

    def require_export_supported(self, feature: str) -> None:
        if not self.manifest(feature).export_supported:
            raise PermissionError(f"Export is not supported for feature: {feature}")

    def require_deletion_supported(self, feature: str) -> None:
        if not self.manifest(feature).deletion_supported:
            raise PermissionError(f"Deletion is not supported for feature: {feature}")

    def require_explanation_supported(self, feature: str) -> None:
        if not self.manifest(feature).explanation_supported:
            raise PermissionError(f"Explanation is not supported for feature: {feature}")

    def require_biometric_deletion_supported(self, feature: str) -> None:
        manifest = self.manifest(feature)
        if not manifest.biometric_or_identity_linked:
            raise PermissionError(f"Feature is not biometric or identity-linked: {feature}")
        if not manifest.deletion_supported:
            raise PermissionError(f"Biometric deletion is not supported for feature: {feature}")

    def _decision(
        self,
        *,
        allowed: bool,
        feature: str,
        consent_state: ConsentState,
        actor_id: str,
        reason: str,
        missing_scopes: Set[str],
    ) -> PrivacyDecision:
        event = AuditEvent(
            event_id=str(uuid4()),
            actor_id=actor_id,
            user_id=consent_state.user_id,
            action="privacy.process.allowed" if allowed else "privacy.process.blocked",
            feature=feature,
            result="allowed" if allowed else "blocked",
            policy_version=consent_state.policy_version,
            reason=reason,
        )
        return PrivacyDecision(
            allowed=allowed,
            feature=feature,
            reason=reason,
            missing_scopes=missing_scopes,
            audit_event=event,
        )


def default_spatial_manifests() -> List[PrivacyManifest]:
    """Runtime manifest subset for audited URAI Spatial features."""

    return [
        PrivacyManifest(feature="process-new-memory", required_consent_tiers={"C2"}),
        PrivacyManifest(
            feature="generate-insights",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(feature="aggregate-timeline", required_consent_tiers={"C2"}),
        PrivacyManifest(
            feature="score-relationship-signals",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(
            feature="voice-events",
            required_consent_tiers={"C5"},
            biometric_or_identity_linked=True,
            explanation_supported=True,
        ),
        PrivacyManifest(
            feature="behavior-signals",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(feature="locations", required_consent_tiers={"C4"}),
        PrivacyManifest(
            feature="emotion-logs",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(feature="rituals", required_consent_tiers={"C2"}),
        PrivacyManifest(
            feature="dream-logs",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(
            feature="relationships",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(
            feature="companion-state",
            required_consent_tiers={"C4"},
            sensitive_inference=True,
            explanation_supported=True,
        ),
        PrivacyManifest(feature="notifications", required_consent_tiers={"C2"}),
        PrivacyManifest(
            feature="clusters",
            required_consent_tiers={"C2"},
            explanation_supported=True,
        ),
        PrivacyManifest(
            feature="replays",
            required_consent_tiers={"C2"},
            explanation_supported=True,
        ),
    ]
