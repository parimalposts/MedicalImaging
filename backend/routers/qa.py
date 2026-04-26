from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.qa_models import QARecordResponse, QAReviewRequest, QAStatsResponse, QAStatus
from services import qa_service

router = APIRouter()


def _row_to_response(row) -> QARecordResponse:
    return QARecordResponse(
        id=row.id,
        annotation_id=row.annotation_id,
        status=QAStatus(row.status),
        reviewer=row.reviewer,
        reviewer_notes=row.reviewer_notes,
        updated_at=row.updated_at,
    )


@router.get("/annotations", response_model=list[QARecordResponse])
def list_qa_records(
    status: str = None,
    series_uid: str = None,
    db: Session = Depends(get_db),
):
    rows = qa_service.get_qa_records(db, status=status, series_uid=series_uid)
    return [_row_to_response(r) for r in rows]


@router.post("/annotations/{annotation_id}/review", response_model=QARecordResponse)
def review_annotation(
    annotation_id: int,
    req: QAReviewRequest,
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    ann = db.execute(
        text("SELECT id FROM annotations WHERE id = :id"), {"id": annotation_id}
    ).fetchone()
    if not ann:
        raise HTTPException(404, "Annotation not found")

    row = qa_service.update_qa_record(
        db,
        annotation_id=annotation_id,
        new_status=req.status,
        reviewer=req.reviewer,
        notes=req.notes,
    )
    return _row_to_response(row)


@router.get("/stats", response_model=QAStatsResponse)
def get_stats(db: Session = Depends(get_db)):
    return qa_service.get_stats(db)
