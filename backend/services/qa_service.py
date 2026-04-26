from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from models.qa_models import QAStatus


def get_qa_records(
    db: Session,
    status: str = None,
    series_uid: str = None,
) -> list:
    filters = []
    params = {}
    if status:
        filters.append("qr.status = :status")
        params["status"] = status
    if series_uid:
        filters.append("a.series_uid = :series_uid")
        params["series_uid"] = series_uid

    where = ("WHERE " + " AND ".join(filters)) if filters else ""
    rows = db.execute(
        text(f"""
            SELECT qr.*, a.filename, a.format, a.series_uid
            FROM qa_records qr
            JOIN annotations a ON a.id = qr.annotation_id
            {where}
            ORDER BY qr.updated_at DESC
        """),
        params,
    ).fetchall()
    return rows


def update_qa_record(
    db: Session,
    annotation_id: int,
    new_status: QAStatus,
    reviewer: str,
    notes: str = None,
) -> dict:
    existing = db.execute(
        text("SELECT * FROM qa_records WHERE annotation_id = :id"),
        {"id": annotation_id},
    ).fetchone()

    old_status = existing.status if existing else None
    now = datetime.utcnow().isoformat()

    if existing:
        db.execute(
            text("""
                UPDATE qa_records
                SET status=:status, reviewer=:reviewer, reviewer_notes=:notes, updated_at=:ts
                WHERE annotation_id=:id
            """),
            {
                "status": new_status.value,
                "reviewer": reviewer,
                "notes": notes,
                "ts": now,
                "id": annotation_id,
            },
        )
    else:
        db.execute(
            text("""
                INSERT INTO qa_records (annotation_id, status, reviewer, reviewer_notes, updated_at)
                VALUES (:id, :status, :reviewer, :notes, :ts)
            """),
            {
                "id": annotation_id,
                "status": new_status.value,
                "reviewer": reviewer,
                "notes": notes,
                "ts": now,
            },
        )

    db.execute(
        text("""
            INSERT INTO qa_history (annotation_id, old_status, new_status, reviewer, timestamp)
            VALUES (:id, :old, :new, :reviewer, :ts)
        """),
        {
            "id": annotation_id,
            "old": old_status,
            "new": new_status.value,
            "reviewer": reviewer,
            "ts": now,
        },
    )
    db.commit()

    return db.execute(
        text("SELECT * FROM qa_records WHERE annotation_id = :id"),
        {"id": annotation_id},
    ).fetchone()


def get_stats(db: Session) -> dict:
    row = db.execute(
        text("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status='flagged'  THEN 1 ELSE 0 END) as flagged
            FROM qa_records
        """)
    ).fetchone()
    return {
        "total": row.total or 0,
        "pending": row.pending or 0,
        "approved": row.approved or 0,
        "rejected": row.rejected or 0,
        "flagged": row.flagged or 0,
    }
