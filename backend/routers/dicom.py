from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services import dicom_service
from models.dicom_models import StudyResponse, SeriesResponse, DicomTag

router = APIRouter()


@router.get("/studies", response_model=list[StudyResponse])
def list_studies():
    return dicom_service.scan_studies()


@router.get("/series/{series_uid}/metadata", response_model=list[DicomTag])
def series_metadata(series_uid: str):
    tags = dicom_service.get_series_metadata(series_uid)
    if tags is None:
        raise HTTPException(404, "Series not found")
    return tags


@router.get("/frame/{series_uid}/{instance_index}")
def get_frame(series_uid: str, instance_index: int):
    png = dicom_service.get_frame_png(series_uid, instance_index)
    if png is None:
        raise HTTPException(404, "Frame not found")
    return Response(content=png, media_type="image/png")


@router.get("/series/{series_uid}/slice-count")
def slice_count(series_uid: str):
    slices = dicom_service.get_series_slices(series_uid)
    return {"series_uid": series_uid, "count": len(slices)}
