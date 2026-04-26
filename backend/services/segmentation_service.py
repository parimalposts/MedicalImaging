"""
Segmentation service: loads .seg.nrrd (3D Slicer), .nii.gz (ITK-SNAP),
and DICOM SEG (OsiriX/Horos) into a unified label map.

Key non-obvious detail: SimpleITK does NOT expose custom NRRD key:=value
metadata, so .seg.nrrd segment names/colors must be parsed from the raw
file header (everything before the first double-newline).
"""

import io
import os
from typing import Optional

import numpy as np
import pydicom
import SimpleITK as sitk
from PIL import Image

from config import settings
from models.segmentation_models import LabelInfo, SegFormat


# ── Format detection ──────────────────────────────────────────────────────────

def detect_format(filename: str) -> SegFormat:
    name = filename.lower()
    if name.endswith(".seg.nrrd"):
        return SegFormat.seg_nrrd
    if name.endswith(".nii.gz") or name.endswith(".nii"):
        return SegFormat.nii_gz
    if name.endswith(".dcm"):
        return SegFormat.dicom_seg
    raise ValueError(f"Unsupported segmentation format: {filename}")


# ── Label extraction ──────────────────────────────────────────────────────────

def _parse_nrrd_custom_attrs(path: str) -> dict:
    """
    Read raw NRRD header to extract Slicer's key:=value custom metadata.
    SimpleITK exposes only standard NRRD keys; custom attrs require this.
    """
    attrs = {}
    with open(path, "rb") as f:
        header_bytes = b""
        prev = b""
        while True:
            chunk = f.read(1)
            if not chunk:
                break
            header_bytes += chunk
            if prev + chunk == b"\n\n":
                break
            prev = chunk
    header_text = header_bytes.decode("utf-8", errors="replace")
    for line in header_text.splitlines():
        if ":=" in line:
            key, _, val = line.partition(":=")
            attrs[key.strip()] = val.strip()
    return attrs


def _labels_from_seg_nrrd(path: str) -> list[LabelInfo]:
    attrs = _parse_nrrd_custom_attrs(path)
    labels = []
    i = 0
    while f"Segment{i}_LabelValue" in attrs:
        lv = int(attrs[f"Segment{i}_LabelValue"])
        name = attrs.get(f"Segment{i}_Name", f"Segment {lv}")
        color_str = attrs.get(f"Segment{i}_Color", "")
        try:
            parts = [float(x) for x in color_str.split()]
            color = parts[:3] if len(parts) >= 3 else None
        except Exception:
            color = None
        labels.append(LabelInfo(label_value=lv, name=name, color_rgb=color))
        i += 1
    return labels or [LabelInfo(label_value=1, name="Segment 1")]


def _labels_from_nii(path: str) -> list[LabelInfo]:
    import nibabel as nib
    img = nib.load(path)
    data = np.asarray(img.dataobj, dtype=np.int16)
    unique_vals = [int(v) for v in np.unique(data) if v != 0]
    return [LabelInfo(label_value=v, name=f"Label {v}") for v in unique_vals]


def _cieLab_to_rgb(lab_scaled: list[int]) -> list[float]:
    """Convert DICOM CIELab (scaled 0-65535) to linear RGB 0-1."""
    L = lab_scaled[0] / 65535 * 100
    a = lab_scaled[1] / 65535 * 255 - 128
    b = lab_scaled[2] / 65535 * 255 - 128

    # CIELab → XYZ (D65 illuminant)
    fy = (L + 16) / 116
    fx = a / 500 + fy
    fz = fy - b / 200
    x = (fx ** 3 if fx > 0.2069 else (fx - 16 / 116) / 7.787) * 0.95047
    y = fy ** 3 if fy > 0.2069 else (fy - 16 / 116) / 7.787
    z = (fz ** 3 if fz > 0.2069 else (fz - 16 / 116) / 7.787) * 1.08883

    # XYZ → linear sRGB
    r = max(0.0, min(1.0, 3.2406 * x - 1.5372 * y - 0.4986 * z))
    g = max(0.0, min(1.0, -0.9689 * x + 1.8758 * y + 0.0415 * z))
    b_ = max(0.0, min(1.0, 0.0557 * x - 0.2040 * y + 1.0570 * z))
    return [r, g, b_]


def _labels_from_dicom_seg(path: str) -> list[LabelInfo]:
    ds = pydicom.dcmread(path)
    labels = []
    for seg in getattr(ds, "SegmentSequence", []):
        lv = int(getattr(seg, "SegmentNumber", 1))
        name = str(getattr(seg, "SegmentLabel", f"Segment {lv}"))
        lab_color = getattr(seg, "RecommendedDisplayCIELabValue", None)
        color = _cieLab_to_rgb(list(lab_color)) if lab_color else None
        labels.append(LabelInfo(label_value=lv, name=name, color_rgb=color))
    return labels or [LabelInfo(label_value=1, name="Segment 1")]


def get_labels(path: str, fmt: SegFormat) -> list[LabelInfo]:
    if fmt == SegFormat.seg_nrrd:
        return _labels_from_seg_nrrd(path)
    if fmt == SegFormat.nii_gz:
        return _labels_from_nii(path)
    if fmt == SegFormat.dicom_seg:
        return _labels_from_dicom_seg(path)
    return []


# ── Slice preview ─────────────────────────────────────────────────────────────

COLORMAPS = {
    1: (255, 80, 80),
    2: (80, 160, 255),
    3: (80, 230, 100),
    4: (255, 200, 60),
}


def get_slice_preview_png(
    path: str, fmt: SegFormat, axis: str, idx: int, label: Optional[int]
) -> Optional[bytes]:
    """Return a 2D PNG slice of the segmentation mask with colormap overlay."""
    if fmt in (SegFormat.seg_nrrd, SegFormat.nii_gz):
        img = sitk.ReadImage(path)
        arr = sitk.GetArrayFromImage(img)  # (Z, Y, X)
    elif fmt == SegFormat.dicom_seg:
        ds = pydicom.dcmread(path)
        rows = int(ds.Rows)
        cols = int(ds.Columns)
        n_frames = int(ds.NumberOfFrames)
        raw = np.frombuffer(ds.PixelData, dtype=np.uint8)
        bits_total = rows * cols * n_frames
        arr_bits = np.unpackbits(raw, bitorder="little")[:bits_total]
        arr = arr_bits.reshape(n_frames, rows, cols).astype(np.uint8)
    else:
        return None

    axis_map = {"axial": 0, "coronal": 1, "sagittal": 2}
    ax = axis_map.get(axis, 0)
    max_idx = arr.shape[ax] - 1
    idx = min(max(0, idx), max_idx)

    slice_2d = np.take(arr, idx, axis=ax)
    h, w = slice_2d.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    labels_to_show = [label] if label else list(range(1, 6))
    for lv in labels_to_show:
        color = COLORMAPS.get(lv, (180, 100, 220))
        mask = slice_2d == lv
        rgb[mask] = color

    img_pil = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    return buf.getvalue()


# ── Format conversion ─────────────────────────────────────────────────────────

def convert_segmentation(src_path: str, target_format: str) -> str:
    """Convert a segmentation file and return the output path."""
    ext_map = {"nii_gz": ".nii.gz", "seg_nrrd": ".seg.nrrd"}
    ext = ext_map.get(target_format, ".nii.gz")
    basename = os.path.splitext(os.path.splitext(os.path.basename(src_path))[0])[0]
    out_path = os.path.join(settings.segmentations_dir, f"{basename}_converted{ext}")
    img = sitk.ReadImage(src_path)
    sitk.WriteImage(img, out_path)
    return out_path
