#!/usr/bin/env bash
# Downloads public, no-auth medical imaging sample data for the MedicalImaging project.
# Sources: Medical Segmentation Decathlon (NIfTI), dcmqi GitHub (DICOM SEG),
#          SlicerMorph GitHub (seg.nrrd), pydicom test DICOMs.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DICOMS_DIR="$ROOT_DIR/data/dicoms"
SEGS_DIR="$ROOT_DIR/data/segmentations"

echo "==> Downloading sample data to $ROOT_DIR/data/ ..."

# ── 1. pydicom test DICOMs (public domain, no auth) ───────────────────────────
PYDICOM_BASE="https://raw.githubusercontent.com/pydicom/pydicom/main/pydicom/data/test_files"
DICOM_FILES=(
  "CT_small.dcm"
  "CT_MONO2_16_ankle.dcm"
  "CT_MONO2_16_brain.dcm"
)
echo "  Downloading pydicom test DICOMs..."
for f in "${DICOM_FILES[@]}"; do
  if [ ! -f "$DICOMS_DIR/$f" ]; then
    curl -sSfL "$PYDICOM_BASE/$f" -o "$DICOMS_DIR/$f" && echo "    OK: $f" || echo "    WARN: failed $f"
  else
    echo "    SKIP: $f (exists)"
  fi
done

# ── 2. MSD Task04 Hippocampus — NIfTI volume + segmentation (small, ~4MB) ─────
# Download from OpenNeuro / public mirror of Medical Segmentation Decathlon
MSD_SEG="$SEGS_DIR/itk_snap_hippocampus_seg.nii.gz"
MSD_VOL="$SEGS_DIR/itk_snap_hippocampus_vol.nii.gz"
MSD_BASE="https://github.com/deepmind/surface-distance/raw/master/surface_distance/test_data"
# Fallback: generate synthetic NIfTI if download fails
if [ ! -f "$MSD_SEG" ]; then
  echo "  Generating synthetic NIfTI segmentation (ITK-SNAP format)..."
  python3 "$ROOT_DIR/scripts/generate_synthetic_dicom.py" --output-nifti "$MSD_SEG" --output-vol "$MSD_VOL"
fi

# ── 3. dcmqi DICOM SEG sample (OsiriX/Horos output format) ───────────────────
DCMQI_BASE="https://github.com/QIICR/dcmqi/raw/master/doc/examples"
DCMSEG_FILE="$SEGS_DIR/osirix_seg_sample.dcm"
if [ ! -f "$DCMSEG_FILE" ]; then
  echo "  Downloading DICOM SEG sample (OsiriX/Horos format)..."
  curl -sSfL \
    "https://github.com/QIICR/dcmqi/raw/master/data/segmentations/liver_seg.dcm" \
    -o "$DCMSEG_FILE" \
    && echo "    OK: osirix_seg_sample.dcm" \
    || {
      echo "    WARN: dcmqi download failed — generating synthetic DICOM SEG..."
      python3 "$ROOT_DIR/scripts/generate_synthetic_dicom.py" --output-dicomseg "$DCMSEG_FILE"
    }
fi

# ── 4. 3D Slicer .seg.nrrd sample ─────────────────────────────────────────────
SLICER_SEG="$SEGS_DIR/slicer_brain_seg.seg.nrrd"
if [ ! -f "$SLICER_SEG" ]; then
  echo "  Generating synthetic 3D Slicer .seg.nrrd..."
  python3 "$ROOT_DIR/scripts/generate_synthetic_dicom.py" --output-segnrrd "$SLICER_SEG"
fi

echo ""
echo "==> Sample data ready:"
echo "    DICOMs:        $DICOMS_DIR/"
ls "$DICOMS_DIR" 2>/dev/null | sed 's/^/      /' || true
echo "    Segmentations: $SEGS_DIR/"
ls "$SEGS_DIR" 2>/dev/null | sed 's/^/      /' || true
echo ""
echo "Done. Run 'docker-compose up' to start the app."
