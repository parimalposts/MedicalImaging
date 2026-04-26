"""
DICOM service: walks data/dicoms/, groups files by SeriesInstanceUID,
sorts slices by ImagePositionPatient Z, and renders frames as PNG.
"""

import io
import os
from typing import Optional

import numpy as np
import pydicom
from PIL import Image

from config import settings


def _window(pixel_array: np.ndarray, wc: float, ww: float) -> np.ndarray:
    """Apply DICOM window center/width and normalize to uint8."""
    low = wc - ww / 2
    high = wc + ww / 2
    clipped = np.clip(pixel_array.astype(float), low, high)
    return ((clipped - low) / (high - low) * 255).astype(np.uint8)


def _z_position(ds: pydicom.Dataset) -> float:
    try:
        return float(ds.ImagePositionPatient[2])
    except Exception:
        return float(getattr(ds, "InstanceNumber", 0))


def scan_studies() -> list[dict]:
    """Scan dicoms_dir and return grouped studies with series."""
    studies: dict[str, dict] = {}
    series_map: dict[str, dict] = {}

    dicom_dir = settings.dicoms_dir
    if not os.path.isdir(dicom_dir):
        return []

    for fname in sorted(os.listdir(dicom_dir)):
        fpath = os.path.join(dicom_dir, fname)
        if not os.path.isfile(fpath):
            continue
        try:
            ds = pydicom.dcmread(fpath, stop_before_pixels=True)
        except Exception:
            continue

        study_uid = str(getattr(ds, "StudyInstanceUID", "UNKNOWN_STUDY"))
        series_uid = str(getattr(ds, "SeriesInstanceUID", "UNKNOWN_SERIES"))

        if study_uid not in studies:
            studies[study_uid] = {
                "study_uid": study_uid,
                "patient_name": str(getattr(ds, "PatientName", "")),
                "patient_id": str(getattr(ds, "PatientID", "")),
                "study_date": str(getattr(ds, "StudyDate", "")),
                "study_description": str(getattr(ds, "StudyDescription", "")),
                "modality": str(getattr(ds, "Modality", "")),
                "path": dicom_dir,
                "series": [],
            }

        if series_uid not in series_map:
            series_map[series_uid] = {
                "series_uid": series_uid,
                "study_uid": study_uid,
                "series_description": str(getattr(ds, "SeriesDescription", "")),
                "modality": str(getattr(ds, "Modality", "")),
                "path": dicom_dir,
                "files": [],
            }

        series_map[series_uid]["files"].append(fpath)

    for series_uid, sdata in series_map.items():
        study_uid = sdata["study_uid"]
        num_slices = len(sdata["files"])
        entry = {k: v for k, v in sdata.items() if k != "files"}
        entry["num_slices"] = num_slices
        if study_uid in studies:
            studies[study_uid]["series"].append(entry)

    return list(studies.values())


def get_series_slices(series_uid: str) -> list[str]:
    """Return sorted list of DICOM file paths for a series."""
    dicom_dir = settings.dicoms_dir
    files_for_series = []
    for fname in os.listdir(dicom_dir):
        fpath = os.path.join(dicom_dir, fname)
        if not os.path.isfile(fpath):
            continue
        try:
            ds = pydicom.dcmread(fpath, stop_before_pixels=True)
            if str(getattr(ds, "SeriesInstanceUID", "")) == series_uid:
                files_for_series.append((fpath, _z_position(ds)))
        except Exception:
            continue
    files_for_series.sort(key=lambda x: x[1])
    return [f for f, _ in files_for_series]


def get_frame_png(series_uid: str, instance_index: int) -> Optional[bytes]:
    """Render a single DICOM frame as PNG bytes."""
    slices = get_series_slices(series_uid)
    if not slices or instance_index < 0 or instance_index >= len(slices):
        return None

    ds = pydicom.dcmread(slices[instance_index])
    arr = ds.pixel_array.astype(float)

    # Apply rescale slope/intercept (Hounsfield units for CT)
    slope = float(getattr(ds, "RescaleSlope", 1))
    intercept = float(getattr(ds, "RescaleIntercept", 0))
    arr = arr * slope + intercept

    wc = float(getattr(ds, "WindowCenter", arr.mean()))
    ww = float(getattr(ds, "WindowWidth", arr.max() - arr.min() or 1))
    if isinstance(wc, pydicom.multival.MultiValue):
        wc = float(wc[0])
    if isinstance(ww, pydicom.multival.MultiValue):
        ww = float(ww[0])

    img_arr = _window(arr, wc, ww)
    img = Image.fromarray(img_arr, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def get_series_metadata(series_uid: str) -> list[dict]:
    """Return flattened DICOM tags for the first file in a series."""
    slices = get_series_slices(series_uid)
    if not slices:
        return []

    ds = pydicom.dcmread(slices[0], stop_before_pixels=True)
    tags = []
    for elem in ds:
        if elem.tag == (0x7FE0, 0x0010):  # skip pixel data
            continue
        try:
            tags.append({
                "tag": str(elem.tag),
                "keyword": elem.keyword or "",
                "vr": elem.VR,
                "value": str(elem.value)[:200],
            })
        except Exception:
            continue
    return tags
