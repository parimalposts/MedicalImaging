import os
import shutil

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from db.database import get_db
from models.segmentation_models import AnnotationResponse, SegFormat
from services import segmentation_service
from config import settings

router = APIRouter()


def _db_annotation_to_response(row, labels) -> AnnotationResponse:
    return AnnotationResponse(
        id=row.id,
        series_uid=row.series_uid,
        format=SegFormat(row.format),
        filename=row.filename,
        label_count=row.label_count,
        labels=labels,
        uploaded_at=row.uploaded_at,
    )


@router.get("/", response_model=list[AnnotationResponse])
def list_annotations(db: Session = Depends(get_db)):
    from sqlalchemy import text
    rows = db.execute(text("SELECT * FROM annotations ORDER BY uploaded_at DESC")).fetchall()
    result = []
    for row in rows:
        try:
            labels = segmentation_service.get_labels(row.path, SegFormat(row.format))
        except Exception:
            labels = []
        result.append(_db_annotation_to_response(row, labels))
    return result


@router.post("/upload", response_model=AnnotationResponse)
async def upload_segmentation(
    file: UploadFile = File(...),
    series_uid: str = Form(default=""),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text

    filename = file.filename or "segmentation"
    try:
        fmt = segmentation_service.detect_format(filename)
    except ValueError as e:
        raise HTTPException(400, str(e))

    os.makedirs(settings.segmentations_dir, exist_ok=True)
    dest_path = os.path.join(settings.segmentations_dir, filename)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        labels = segmentation_service.get_labels(dest_path, fmt)
    except Exception:
        labels = []

    db.execute(
        text("""
            INSERT INTO annotations (series_uid, format, path, filename, label_count)
            VALUES (:series_uid, :format, :path, :filename, :label_count)
        """),
        {
            "series_uid": series_uid or None,
            "format": fmt.value,
            "path": dest_path,
            "filename": filename,
            "label_count": len(labels),
        },
    )
    db.execute(
        text("""
            INSERT INTO qa_records (annotation_id, status)
            SELECT last_insert_rowid(), 'pending'
        """)
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM annotations WHERE path = :path"), {"path": dest_path}
    ).fetchone()
    return _db_annotation_to_response(row, labels)


@router.get("/{annotation_id}", response_model=AnnotationResponse)
def get_annotation(annotation_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import text
    row = db.execute(
        text("SELECT * FROM annotations WHERE id = :id"), {"id": annotation_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Annotation not found")
    labels = segmentation_service.get_labels(row.path, SegFormat(row.format))
    return _db_annotation_to_response(row, labels)


@router.get("/{annotation_id}/slice")
def slice_preview(
    annotation_id: int,
    axis: str = "axial",
    idx: int = 50,
    label: int = None,
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    row = db.execute(
        text("SELECT * FROM annotations WHERE id = :id"), {"id": annotation_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Annotation not found")

    png = segmentation_service.get_slice_preview_png(
        row.path, SegFormat(row.format), axis, idx, label
    )
    if png is None:
        raise HTTPException(500, "Failed to render slice")
    return Response(content=png, media_type="image/png")


@router.post("/{annotation_id}/convert")
def convert_annotation(
    annotation_id: int,
    target: str = "nii_gz",
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    row = db.execute(
        text("SELECT * FROM annotations WHERE id = :id"), {"id": annotation_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Annotation not found")

    try:
        out_path = segmentation_service.convert_segmentation(row.path, target)
    except Exception as e:
        raise HTTPException(500, f"Conversion failed: {e}")

    return {"output_path": out_path, "format": target}
