"""Privacy job planning for export, deletion, and biometric deletion.

These planners are deterministic and dependency-free. Production workers can use
these plans to execute Firestore/Storage operations while tests verify the
expected scope before any destructive action runs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, List, Sequence
from uuid import uuid4


EXPORTABLE_COLLECTIONS = [
    "users",
    "memories",
    "stars",
    "insights",
    "clusters",
    "replays",
    "emotionLogs",
    "voiceEvents",
    "behaviorSignals",
    "locations",
    "relationships",
    "rituals",
    "dreamLogs",
    "notifications",
    "companionState",
]

DELETABLE_COLLECTIONS = list(EXPORTABLE_COLLECTIONS)
BIOMETRIC_COLLECTIONS = ["voiceEvents"]


@dataclass(frozen=True)
class JobStep:
    action: str
    collection: str
    user_id: str
    description: str


@dataclass(frozen=True)
class PrivacyJobPlan:
    job_id: str
    job_type: str
    user_id: str
    steps: Sequence[JobStep]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def is_empty(self) -> bool:
        return len(self.steps) == 0

    @property
    def collections(self) -> List[str]:
        return [step.collection for step in self.steps]


class PrivacyJobPlanner:
    """Creates deterministic privacy job plans."""

    def __init__(
        self,
        *,
        exportable_collections: Iterable[str] = EXPORTABLE_COLLECTIONS,
        deletable_collections: Iterable[str] = DELETABLE_COLLECTIONS,
        biometric_collections: Iterable[str] = BIOMETRIC_COLLECTIONS,
    ):
        self.exportable_collections = list(exportable_collections)
        self.deletable_collections = list(deletable_collections)
        self.biometric_collections = list(biometric_collections)

    def plan_export(self, user_id: str) -> PrivacyJobPlan:
        return PrivacyJobPlan(
            job_id=str(uuid4()),
            job_type="export",
            user_id=user_id,
            steps=[
                JobStep(
                    action="export_collection",
                    collection=collection,
                    user_id=user_id,
                    description=f"Export user-linked records from {collection}.",
                )
                for collection in self.exportable_collections
            ],
        )

    def plan_deletion(self, user_id: str) -> PrivacyJobPlan:
        return PrivacyJobPlan(
            job_id=str(uuid4()),
            job_type="delete",
            user_id=user_id,
            steps=[
                JobStep(
                    action="delete_collection_records",
                    collection=collection,
                    user_id=user_id,
                    description=f"Delete or legally handle user-linked records from {collection}.",
                )
                for collection in self.deletable_collections
            ],
        )

    def plan_biometric_deletion(self, user_id: str) -> PrivacyJobPlan:
        return PrivacyJobPlan(
            job_id=str(uuid4()),
            job_type="delete_biometric",
            user_id=user_id,
            steps=[
                JobStep(
                    action="delete_biometric_records",
                    collection=collection,
                    user_id=user_id,
                    description=f"Delete biometric or identity-linked records from {collection}.",
                )
                for collection in self.biometric_collections
            ],
        )
