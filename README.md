# MedicalImaging — AI Research Portfolio

A full-stack web application showcasing hands-on experience with **3D Slicer**, **ITK-SNAP**, and **OsiriX / Horos** for AI medical imaging research. Demonstrates end-to-end competency across two core workflows: **3D digital asset generation** from volumetric segmentations, and **annotation QA lifecycle management** across multiple tool formats.

---

## Features

### DICOM Browser
Browse DICOM series loaded from `data/dicoms/`. Inspect every metadata tag in a searchable inspector panel.

### Multi-Planar Reconstruction (MPR) Viewer
Cornerstone.js v3 renders axial, coronal, sagittal, and 3D overview panes from any loaded series. Supports windowing presets — Soft Tissue, Bone, Lung.

### Segmentation Manager
Upload segmentations from any of the three supported tools. Format is auto-detected and per-segment labels, names, and colors are extracted from each file's native metadata structure.

| File format | Tool | Metadata source |
|-------------|------|----------------|
| `.seg.nrrd` | 3D Slicer | Custom `key:=value` pairs in NRRD header |
| `.nii.gz` | ITK-SNAP | Unique voxel values (label 0 = background) |
| `.dcm` (DICOM SEG) | OsiriX / Horos | `SegmentSequence` with CIELab color encoding |

### 3D Asset Generation
Marching cubes pipeline converts any segmentation mask into a clean, physically scaled 3D mesh — exported as GLB, STL, or OBJ and viewable in a Three.js orbit viewer.

**Pipeline steps:**
1. Load segmentation via SimpleITK → `numpy` array (Z, Y, X)
2. Extract binary mask for selected label
3. `scipy.ndimage.gaussian_filter` (σ=1.0) — eliminates staircase artifact
4. `skimage.measure.marching_cubes(spacing=voxel_spacing_mm)` — physically correct proportions
5. Apply ITK direction cosines for world-space orientation
6. Laplacian smoothing (configurable iterations)
7. LPS → Three.js Y-up coordinate rotation
8. Export via `trimesh.exchange.gltf.export_glb()` → ready for downstream AI use

### Annotation QA Dashboard
Review segmentations across all tool formats with a structured approval workflow:

```
pending → approved
        → rejected
        → flagged → pending (re-review)
```

Every status transition is persisted in a `qa_history` audit table — mirroring clinical-grade QA requirements for annotated AI training data.

### Tool Showcase
Tabbed deep-dives into each tool: workflow steps, file format internals, and the exact backend parsing code that handles each tool's output.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python 3.11, FastAPI, pydicom, SimpleITK, nibabel, scikit-image, trimesh, scipy, SQLite / SQLAlchemy |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Cornerstone.js v3, @react-three/fiber, Three.js |
| Infrastructure | Docker, docker-compose |

---

## Project Structure

```
MedicalImaging/
├── docker-compose.yml
├── .env.example
├── scripts/
│   ├── download_sample_data.sh       # fetches public DICOMs + segmentations (no auth required)
│   └── generate_synthetic_dicom.py   # generates phantom data for local dev / CI
├── data/                             # git-ignored; populated by scripts
│   ├── dicoms/
│   ├── segmentations/
│   └── meshes/
├── backend/
│   ├── main.py                       # FastAPI app + StaticFiles mount for generated meshes
│   ├── config.py                     # pydantic-settings (DATA_DIR, SQLITE_PATH, CORS)
│   ├── db/
│   │   ├── database.py               # SQLAlchemy engine + session + init_db()
│   │   └── migrations/init.sql       # studies, series, annotations, qa_records, qa_history, mesh_jobs
│   ├── models/                       # Pydantic response schemas
│   ├── routers/                      # FastAPI route handlers
│   │   ├── dicom.py                  # studies list, metadata tags, frame PNG endpoint
│   │   ├── segmentation.py           # upload, format detection, slice preview, conversion
│   │   ├── mesh.py                   # generate job, status, download
│   │   └── qa.py                     # list, review, stats
│   └── services/                     # Business logic (no FastAPI dependencies)
│       ├── dicom_service.py          # pydicom scan + Z-sorted slice renderer
│       ├── segmentation_service.py   # multi-format loader + CIELab→RGB + slice PNG
│       ├── mesh_service.py           # full marching cubes pipeline
│       └── qa_service.py             # state machine + audit trail
└── frontend/
    └── src/
        ├── app/                      # Next.js App Router pages
        │   ├── page.tsx              # dashboard
        │   ├── dicom/                # DICOM browser
        │   ├── viewer/[seriesId]/    # MPR viewer
        │   ├── segmentation/         # upload + label explorer
        │   ├── mesh/                 # mesh generator + Three.js viewer
        │   ├── qa/                   # annotation QA dashboard
        │   └── tools/               # 3D Slicer / ITK-SNAP / OsiriX showcase
        ├── components/
        │   ├── MPRViewer.tsx         # Cornerstone.js v3 — 2×2 pane layout
        │   ├── CornerstoneViewport.tsx
        │   ├── MeshViewer.tsx        # @react-three/fiber orbit viewer
        │   ├── MeshGenerateForm.tsx
        │   ├── QADashboard.tsx
        │   ├── QAReviewCard.tsx
        │   ├── SegmentationUpload.tsx
        │   ├── SegmentationLabels.tsx
        │   ├── ToolPanel.tsx         # tabbed tool showcase
        │   └── ui/                   # StatusBadge, LoadingSpinner
        ├── lib/
        │   ├── api.ts                # typed fetch wrappers for all endpoints
        │   ├── cornerstone.ts        # Cornerstone.js v3 init (SSR-safe, lazy)
        │   └── three-loaders.ts      # GLTFLoader / STLLoader / OBJLoader helpers
        └── types/index.ts            # TypeScript interfaces mirroring Pydantic models
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Python 3.11+ and Node.js 20+ for local development

### Option A — Docker (recommended)

```bash
# 1. Clone / enter the project
cd MedicalImaging

# 2. Generate sample data (one-time setup)
python3 scripts/generate_synthetic_dicom.py \
  --output-dicom        data/dicoms/ \
  --output-nifti        data/segmentations/itk_snap_hippocampus_seg.nii.gz \
  --output-vol          data/segmentations/itk_snap_hippocampus_vol.nii.gz \
  --output-dicomseg     data/segmentations/osirix_seg_sample.dcm \
  --output-segnrrd      data/segmentations/slicer_brain_seg.seg.nrrd

# 3. Start everything
docker-compose up

# Frontend → http://localhost:3000
# API docs  → http://localhost:8000/docs
```

### Option B — Local development

**Backend:**

```bash
cd backend
pip install -r requirements.txt

# Set environment
export DATA_DIR=../data
export SQLITE_PATH=../data/medimaging.db
export CORS_ORIGINS=http://localhost:3000

uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install

NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# → http://localhost:3000
```

### Downloading real public data (optional)

```bash
bash scripts/download_sample_data.sh
```

This fetches no-auth public DICOMs from pydicom's test suite and sample segmentations from Medical Segmentation Decathlon / dcmqi. Falls back to synthetic generation if downloads fail.

---

## API Reference

Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dicom/studies` | List all studies with nested series |
| `GET` | `/api/dicom/frame/{series_uid}/{index}` | Render a DICOM slice as PNG |
| `GET` | `/api/dicom/series/{uid}/metadata` | All DICOM tags (pixel data excluded) |
| `GET` | `/api/segmentation/` | List all uploaded segmentations |
| `POST` | `/api/segmentation/upload` | Upload a segmentation file (multipart) |
| `GET` | `/api/segmentation/{id}/slice` | 2D colormap preview PNG |
| `POST` | `/api/segmentation/{id}/convert` | Convert between formats via SimpleITK |
| `POST` | `/api/mesh/generate` | Run marching cubes pipeline |
| `GET` | `/api/mesh/{id}/download` | Download GLB / STL / OBJ |
| `GET` | `/api/qa/annotations` | List QA records (filterable by status) |
| `POST` | `/api/qa/annotations/{id}/review` | Approve / reject / flag |
| `GET` | `/api/qa/stats` | Aggregate counts by status |

---

## Tool Integration Details

### 3D Slicer
- **Format:** `.seg.nrrd` — 3D NRRD array with Slicer-specific `Segment0_Name`, `Segment0_Color`, `Segment0_LabelValue` key-value pairs embedded before the header terminator (`\n\n`)
- **Non-obvious:** SimpleITK reads pixel data but silently drops custom NRRD metadata; this app parses the raw header separately to recover label names
- **Workflow:** Load → Segment Editor (Paint / Threshold / Grow from Seeds) → Export → Upload here

### ITK-SNAP
- **Format:** `.nii.gz` — standard NIfTI with integer label values; label 0 is always background
- **Key detail:** Voxel spacing from the NIfTI header (`img.header.get_zooms()`) is passed directly to `marching_cubes(spacing=...)` to produce physically accurate mesh dimensions
- **Workflow:** Load → place seeds → snake evolution → Export Segmentation Image → Upload here

### OsiriX / Horos
- **Format:** DICOM SEG (SOP class `1.2.840.10008.5.1.4.1.1.66.4`) — 1-bit packed binary masks per segment, with `SegmentSequence` holding label names and CIELab color values
- **Key detail:** CIELab values are scaled to 0–65535 (not 0–100); this app converts them to sRGB for color swatches
- **PACS-compatible:** DICOM SEG is the standard clinical handoff format — readable by any DICOM library without proprietary tooling
- **Horos:** Free macOS alternative to OsiriX; produces identical DICOM SEG output

---

## Known Gotchas

| Issue | Solution |
|-------|----------|
| Cornerstone.js crashes on SSR | All viewer components use `dynamic({ ssr: false })` |
| Mesh renders upside-down | 90° X-axis rotation applied: ITK LPS → Three.js Y-up |
| `.seg.nrrd` labels show as integers | SimpleITK doesn't expose custom NRRD attrs; raw header is parsed separately |
| `useGLTF` sees empty scene from trimesh | Use `trimesh.exchange.gltf.export_glb()` directly, not `mesh.export()` |
| SimpleITK wheel on Apple Silicon | Docker uses `FROM python:3.11-slim` (arm64 wheel available for 3.11) |

---

## License

MIT
