from pydantic import BaseModel
from typing import Optional
from enum import Enum


class SegFormat(str, Enum):
    seg_nrrd = "seg_nrrd"
    nii_gz = "nii_gz"
    dicom_seg = "dicom_seg"


class LabelInfo(BaseModel):
    label_value: int
    name: str
    color_rgb: Optional[list[float]] = None  # [r, g, b] 0-1 range


class AnnotationResponse(BaseModel):
    id: int
    series_uid: Optional[str]
    format: SegFormat
    filename: str
    label_count: int
    labels: list[LabelInfo] = []
    uploaded_at: str
