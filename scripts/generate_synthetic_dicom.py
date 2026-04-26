"""
Generates synthetic medical imaging data for development/demo:
  - DICOM series (5-slice CT phantom with sphere)
  - NIfTI volume + segmentation (ITK-SNAP format)
  - DICOM SEG (OsiriX/Horos format)
  - .seg.nrrd (3D Slicer format)

Usage:
  python generate_synthetic_dicom.py --output-dicom /path/to/dir/
  python generate_synthetic_dicom.py --output-nifti seg.nii.gz --output-vol vol.nii.gz
  python generate_synthetic_dicom.py --output-dicomseg out.dcm
  python generate_synthetic_dicom.py --output-segnrrd out.seg.nrrd
"""

import argparse
import datetime
import io
import os
import struct
import sys
import uuid


def _numpy_sphere(shape=(64, 64, 32), radii=None):
    """Return (volume, mask) numpy arrays with ellipsoid phantoms."""
    import numpy as np

    vol = np.zeros(shape, dtype=np.int16)
    mask = np.zeros(shape, dtype=np.uint8)
    cx, cy, cz = shape[0] // 2, shape[1] // 2, shape[2] // 2
    if radii is None:
        radii = [(shape[0] // 4, shape[1] // 4, shape[2] // 4)]

    for label, (rx, ry, rz) in enumerate(radii, start=1):
        zz, yy, xx = np.ogrid[:shape[0], :shape[1], :shape[2]]
        inside = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 + ((zz - cz) / rz) ** 2 <= 1
        vol[inside] = 400 + label * 100
        mask[inside] = label

    vol += np.random.default_rng(42).integers(-50, 50, size=shape, dtype=np.int16)
    return vol, mask


def generate_dicom_series(output_dir: str):
    """Write a 5-slice synthetic CT series as DICOM files."""
    try:
        import pydicom
        from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
        from pydicom.uid import generate_uid
        import numpy as np
    except ImportError:
        print("pydicom / numpy not installed — skipping DICOM generation", file=sys.stderr)
        return

    os.makedirs(output_dir, exist_ok=True)
    vol, _ = _numpy_sphere(shape=(5, 128, 128), radii=[(20, 20, 2)])
    series_uid = generate_uid()
    study_uid = generate_uid()
    for i in range(vol.shape[0]):
        slice_arr = vol[i].astype(np.int16)
        sop_uid = generate_uid()
        file_meta = FileMetaDataset()
        file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"  # CT
        file_meta.MediaStorageSOPInstanceUID = sop_uid
        file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian

        ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
        ds.is_little_endian = True
        ds.is_implicit_VR = False
        ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
        ds.SOPInstanceUID = sop_uid
        ds.StudyInstanceUID = study_uid
        ds.SeriesInstanceUID = series_uid
        ds.PatientName = "Phantom^Sample"
        ds.PatientID = "PHANTOM001"
        ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
        ds.StudyTime = "120000"
        ds.Modality = "CT"
        ds.SeriesDescription = "Synthetic CT Phantom"
        ds.StudyDescription = "MedicalImaging Demo Study"
        ds.InstanceNumber = i + 1
        ds.ImagePositionPatient = [0.0, 0.0, float(i * 2)]
        ds.ImageOrientationPatient = [1, 0, 0, 0, 1, 0]
        ds.PixelSpacing = [1.0, 1.0]
        ds.SliceThickness = 2.0
        ds.Rows, ds.Columns = slice_arr.shape
        ds.BitsAllocated = 16
        ds.BitsStored = 16
        ds.HighBit = 15
        ds.PixelRepresentation = 1
        ds.SamplesPerPixel = 1
        ds.PhotometricInterpretation = "MONOCHROME2"
        ds.RescaleIntercept = -1024
        ds.RescaleSlope = 1
        ds.WindowCenter = 400
        ds.WindowWidth = 1500
        ds.PixelData = slice_arr.tobytes()
        out_path = os.path.join(output_dir, f"CT_phantom_{i+1:03d}.dcm")
        ds.save_as(out_path, write_like_original=False)
        print(f"    Written: {out_path}")


def generate_nifti(seg_path: str, vol_path: str):
    """Write synthetic NIfTI volume and segmentation (ITK-SNAP format)."""
    try:
        import nibabel as nib
        import numpy as np
    except ImportError:
        print("nibabel / numpy not installed — skipping NIfTI generation", file=sys.stderr)
        return

    shape = (64, 64, 32)
    radii = [(18, 18, 8), (10, 10, 5)]
    vol, mask = _numpy_sphere(shape, radii)

    affine = np.diag([1.5, 1.5, 3.0, 1.0])  # 1.5×1.5×3mm voxels
    nib.save(nib.Nifti1Image(vol.astype(np.int16), affine), vol_path)
    nib.save(nib.Nifti1Image(mask.astype(np.uint8), affine), seg_path)
    print(f"    Written NIfTI vol:  {vol_path}")
    print(f"    Written NIfTI seg:  {seg_path}")


def generate_dicom_seg(output_path: str):
    """Write a minimal DICOM SEG file (OsiriX/Horos output format)."""
    try:
        import pydicom
        from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
        from pydicom.sequence import Sequence
        from pydicom.uid import generate_uid
        import numpy as np
    except ImportError:
        print("pydicom / numpy not installed — skipping DICOM SEG generation", file=sys.stderr)
        return

    shape = (5, 64, 64)
    _, mask = _numpy_sphere(shape, radii=[(15, 15, 2)])

    sop_uid = generate_uid()
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.66.4"  # SEG
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian

    ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.66.4"
    ds.SOPInstanceUID = sop_uid
    ds.Modality = "SEG"
    ds.PatientName = "Phantom^Sample"
    ds.PatientID = "PHANTOM001"
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SeriesNumber = 99
    ds.InstanceNumber = 1
    ds.Rows, ds.Columns = shape[1], shape[2]
    ds.NumberOfFrames = shape[0]
    ds.BitsAllocated = 1
    ds.BitsStored = 1
    ds.HighBit = 0
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.ContentLabel = "SEGMENTATION"
    ds.ContentDescription = "Synthetic OsiriX/Horos DICOM SEG"
    ds.SegmentationType = "BINARY"

    seg_item = Dataset()
    seg_item.SegmentNumber = 1
    seg_item.SegmentLabel = "Tumor Region"
    seg_item.SegmentAlgorithmType = "MANUAL"
    seg_item.SegmentedPropertyCategoryCodeSequence = Sequence()
    seg_item.SegmentedPropertyTypeCodeSequence = Sequence()
    # CIELab color: approximate red in CIELab (L=53, a=80, b=67 → scaled)
    seg_item.RecommendedDisplayCIELabValue = [13826, 31354, 28162]
    ds.SegmentSequence = Sequence([seg_item])

    binary_mask = (mask == 1).astype(np.uint8)
    packed = np.packbits(binary_mask.flatten(), bitorder="little")
    ds.PixelData = packed.tobytes()

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    ds.save_as(output_path, write_like_original=False)
    print(f"    Written DICOM SEG:  {output_path}")


def generate_seg_nrrd(output_path: str):
    """Write a .seg.nrrd file with 3D Slicer-compatible custom metadata."""
    try:
        import numpy as np
    except ImportError:
        print("numpy not installed — skipping seg.nrrd generation", file=sys.stderr)
        return

    shape = (32, 64, 64)
    radii = [(18, 18, 8), (10, 8, 5)]
    _, mask = _numpy_sphere(shape, radii)

    segment_meta = {
        "Segment0_ID": "Segment_1",
        "Segment0_Name": "Whole Tumor",
        "Segment0_Color": "0.9 0.2 0.2",
        "Segment0_LabelValue": "1",
        "Segment0_Layer": "0",
        "Segment0_Extent": "10 53 10 53 5 26",
        "Segment1_ID": "Segment_2",
        "Segment1_Name": "Tumor Core",
        "Segment1_Color": "0.2 0.6 0.9",
        "Segment1_LabelValue": "2",
        "Segment1_Layer": "0",
        "Segment1_Extent": "22 41 22 41 11 20",
    }

    arr = mask.astype(np.int16)
    raw_data = arr.tobytes()

    header_lines = [
        "NRRD0004",
        "# 3D Slicer segmentation file",
        "type: short",
        "dimension: 3",
        f"sizes: {shape[2]} {shape[1]} {shape[0]}",
        "space: left-posterior-superior",
        "space directions: (1.5,0,0) (0,1.5,0) (0,0,3)",
        "space origin: (0,0,0)",
        "kinds: domain domain domain",
        "endian: little",
        "encoding: raw",
    ]
    for k, v in segment_meta.items():
        header_lines.append(f"{k}:={v}")

    header = "\n".join(header_lines) + "\n\n"
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(header.encode("utf-8"))
        f.write(raw_data)
    print(f"    Written seg.nrrd:   {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic medical imaging data")
    parser.add_argument("--output-dicom", help="Directory for synthetic DICOM series")
    parser.add_argument("--output-nifti", help="Output path for NIfTI segmentation (.nii.gz)")
    parser.add_argument("--output-vol", help="Output path for NIfTI volume (.nii.gz)")
    parser.add_argument("--output-dicomseg", help="Output path for DICOM SEG (.dcm)")
    parser.add_argument("--output-segnrrd", help="Output path for 3D Slicer seg.nrrd")
    args = parser.parse_args()

    if args.output_dicom:
        generate_dicom_series(args.output_dicom)
    if args.output_nifti and args.output_vol:
        generate_nifti(args.output_nifti, args.output_vol)
    elif args.output_nifti:
        vol_path = args.output_nifti.replace("_seg.", "_vol.")
        generate_nifti(args.output_nifti, vol_path)
    if args.output_dicomseg:
        generate_dicom_seg(args.output_dicomseg)
    if args.output_segnrrd:
        generate_seg_nrrd(args.output_segnrrd)

    if not any(vars(args).values()):
        parser.print_help()


if __name__ == "__main__":
    main()
