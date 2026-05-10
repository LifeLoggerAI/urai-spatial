"""URAI Spatial privacy runtime helpers.

This package is intentionally dependency-free so it can run in GitHub Actions
and be embedded into Firebase jobs, API handlers, or backend workers later.
"""

from .guard import (
    AuditEvent,
    ConsentRecord,
    ConsentState,
    PrivacyDecision,
    PrivacyGuard,
    PrivacyManifest,
)

__all__ = [
    "AuditEvent",
    "ConsentRecord",
    "ConsentState",
    "PrivacyDecision",
    "PrivacyGuard",
    "PrivacyManifest",
]
