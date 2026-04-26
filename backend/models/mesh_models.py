from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ExportFormat(str, Enum):
    glb = "glb"
    stl = "stl"
    obj = "obj"


class MeshJobRequest(BaseModel):
    annotation_id: int
    label_index: int = 1
    smoothing_iterations: int = 5
    export_format: ExportFormat = ExportFormat.glb


class MeshJobResponse(BaseModel):
    id: int
    annotation_id: int
    label_index: int
    smoothing_iterations: int
    export_format: str
    status: str
    output_path: Optional[str]
    error_message: Optional[str]
    created_at: str
    completed_at: Optional[str]
