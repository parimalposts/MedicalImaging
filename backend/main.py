import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.database import init_db
from routers import dicom, segmentation, mesh, qa

app = FastAPI(
    title="MedicalImaging API",
    description="3D Slicer / ITK-SNAP / OsiriX AI Research Portfolio",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dicom.router, prefix="/api/dicom", tags=["DICOM"])
app.include_router(segmentation.router, prefix="/api/segmentation", tags=["Segmentation"])
app.include_router(mesh.router, prefix="/api/mesh", tags=["Mesh"])
app.include_router(qa.router, prefix="/api/qa", tags=["QA"])

os.makedirs(settings.meshes_dir, exist_ok=True)
app.mount("/meshes", StaticFiles(directory=settings.meshes_dir), name="meshes")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
