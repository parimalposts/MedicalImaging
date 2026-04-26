from pydantic import BaseModel
from typing import Optional


class DicomTag(BaseModel):
    tag: str
    keyword: str
    vr: str
    value: str


class SeriesResponse(BaseModel):
    series_uid: str
    study_uid: str
    series_description: Optional[str]
    num_slices: int
    modality: Optional[str]
    path: str


class StudyResponse(BaseModel):
    study_uid: str
    patient_name: Optional[str]
    patient_id: Optional[str]
    study_date: Optional[str]
    study_description: Optional[str]
    modality: Optional[str]
    series: list[SeriesResponse] = []
