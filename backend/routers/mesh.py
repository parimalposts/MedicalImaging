import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from db.database import get_db
from models.mesh_models import MeshJobRequest, MeshJobResponse
from services import mesh_service

router = APIRouter()


def _row_to_response(row) -> MeshJobResponse:
    return MeshJobResponse(
        id=row.id,
        annotation_id=row.annotation_id,
        label_index=row.label_index,
        smoothing_iterations=row.smoothing_iterations,
        export_format=row.export_format,
        status=row.status,
        output_path=row.output_path,
        error_message=row.error_message,
        created_at=row.created_at,
        completed_at=row.completed_at,
    )


@router.get("/jobs", response_model=list[MeshJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT * FROM mesh_jobs ORDER BY created_at DESC")
    ).fetchall()
    return [_row_to_response(r) for r in rows]


@router.post("/generate", response_model=MeshJobResponse)
def generate_mesh(req: MeshJobRequest, db: Session = Depends(get_db)):
    ann = db.execute(
        text("SELECT * FROM annotations WHERE id = :id"), {"id": req.annotation_id}
    ).fetchone()
    if not ann:
        raise HTTPException(404, "Annotation not found")

    db.execute(
        text("""
            INSERT INTO mesh_jobs
              (annotation_id, label_index, smoothing_iterations, export_format, status)
            VALUES (:ann, :label, :smooth, :fmt, 'processing')
        """),
        {
            "ann": req.annotation_id,
            "label": req.label_index,
            "smooth": req.smoothing_iterations,
            "fmt": req.export_format.value,
        },
    )
    db.commit()
    job_id = db.execute(text("SELECT last_insert_rowid()")).scalar()

    try:
        out_path = mesh_service.generate_mesh(
            annotation_path=ann.path,
            label_index=req.label_index,
            smoothing_iterations=req.smoothing_iterations,
            export_format=req.export_format.value,
            job_id=job_id,
        )
        db.execute(
            text("""
                UPDATE mesh_jobs
                SET status='done', output_path=:path, completed_at=:ts
                WHERE id=:id
            """),
            {"path": out_path, "ts": datetime.utcnow().isoformat(), "id": job_id},
        )
    except Exception as e:
        db.execute(
            text("UPDATE mesh_jobs SET status='error', error_message=:err WHERE id=:id"),
            {"err": str(e), "id": job_id},
        )
        db.commit()
        raise HTTPException(500, f"Mesh generation failed: {e}")

    db.commit()
    row = db.execute(text("SELECT * FROM mesh_jobs WHERE id=:id"), {"id": job_id}).fetchone()
    return _row_to_response(row)


@router.get("/{job_id}", response_model=MeshJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM mesh_jobs WHERE id=:id"), {"id": job_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Job not found")
    return _row_to_response(row)


@router.get("/{job_id}/download")
def download_mesh(job_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM mesh_jobs WHERE id=:id"), {"id": job_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Job not found")
    if row.status != "done" or not row.output_path:
        raise HTTPException(400, f"Mesh not ready (status: {row.status})")
    if not os.path.isfile(row.output_path):
        raise HTTPException(404, "Mesh file missing from disk")

    ext = os.path.splitext(row.output_path)[1].lower()
    media_types = {".glb": "model/gltf-binary", ".stl": "model/stl", ".obj": "text/plain"}
    return FileResponse(
        row.output_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=os.path.basename(row.output_path),
    )
