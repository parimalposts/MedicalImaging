from pydantic import BaseModel
from typing import Optional
from enum import Enum


class QAStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    flagged = "flagged"


class QAReviewRequest(BaseModel):
    status: QAStatus
    reviewer: str
    notes: Optional[str] = None


class QARecordResponse(BaseModel):
    id: int
    annotation_id: int
    status: QAStatus
    reviewer: Optional[str]
    reviewer_notes: Optional[str]
    updated_at: str


class QAStatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    flagged: int
