"""
Mesh generation service: marching cubes pipeline for converting segmentation
masks into 3D assets (GLB/STL/OBJ).

Non-obvious steps documented inline:
- Gaussian pre-smoothing prevents staircase marching cubes artifacts
- spacing param ensures correct real-world proportions
- ITK LPS → Three.js Y-up: 90° X-axis rotation
- trimesh.exchange.gltf.export_glb() avoids the scene-wrapper bug
"""

import os
from datetime import datetime

import numpy as np
import SimpleITK as sitk
import trimesh
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes

from config import settings


def _load_mask_array(path: str) -> tuple[np.ndarray, tuple[float, float, float]]:
    """Load segmentation file and return (array ZYX, spacing XYZ tuple)."""
    img = sitk.ReadImage(path)
    arr = sitk.GetArrayFromImage(img)  # Z, Y, X
    spacing = img.GetSpacing()  # X, Y, Z
    return arr, spacing


def _apply_direction_transform(
    mesh: trimesh.Trimesh, img: sitk.Image
) -> trimesh.Trimesh:
    """Apply ITK image direction cosines so mesh is in correct world orientation."""
    direction = np.array(img.GetDirection()).reshape(3, 3)
    origin = np.array(img.GetOrigin())
    spacing = np.array(img.GetSpacing())

    affine = np.eye(4)
    affine[:3, :3] = direction * spacing
    affine[:3, 3] = origin
    mesh.apply_transform(affine)
    return mesh


def _lps_to_threejs(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Rotate from ITK LPS coordinates to Three.js Y-up right-handed system.
    Without this, the mesh renders upside-down in the browser viewer.
    """
    rot = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
    mesh.apply_transform(rot)
    return mesh


def generate_mesh(
    annotation_path: str,
    label_index: int,
    smoothing_iterations: int,
    export_format: str,
    job_id: int,
) -> str:
    """
    Full pipeline: load → binary mask → smooth → marching cubes →
    direction transform → Laplacian smooth → coordinate fix → export.
    Returns the output file path.
    """
    os.makedirs(settings.meshes_dir, exist_ok=True)

    # 1. Load
    img = sitk.ReadImage(annotation_path)
    arr = sitk.GetArrayFromImage(img).astype(np.float32)  # Z, Y, X
    spacing_xyz = img.GetSpacing()
    # marching_cubes spacing param expects (dz, dy, dx) order matching array axes
    spacing_zyx = (spacing_xyz[2], spacing_xyz[1], spacing_xyz[0])

    # 2. Binary mask for the requested label
    binary = (arr == label_index).astype(np.float32)
    if binary.sum() == 0:
        raise ValueError(f"Label {label_index} not found in segmentation")

    # 3. Gaussian smoothing — eliminates staircase artifact before marching cubes
    smoothed = gaussian_filter(binary, sigma=1.0)

    # 4. Marching cubes with physically correct voxel spacing
    verts, faces, normals, _ = marching_cubes(smoothed, level=0.5, spacing=spacing_zyx)

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)

    # 5. Apply ITK direction cosines for world-space orientation
    mesh = _apply_direction_transform(mesh, img)

    # 6. Laplacian smoothing
    if smoothing_iterations > 0:
        trimesh.smoothing.filter_laplacian(mesh, iterations=smoothing_iterations)

    # 7. LPS → Three.js Y-up coordinate system
    mesh = _lps_to_threejs(mesh)

    # 8. Export
    ext_map = {"glb": ".glb", "stl": ".stl", "obj": ".obj"}
    ext = ext_map.get(export_format, ".glb")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_filename = f"mesh_job{job_id}_label{label_index}_{timestamp}{ext}"
    out_path = os.path.join(settings.meshes_dir, out_filename)

    if export_format == "glb":
        # Use direct GLB export to avoid scene-wrapper that breaks useGLTF
        glb_bytes = trimesh.exchange.gltf.export_glb(mesh)
        with open(out_path, "wb") as f:
            f.write(glb_bytes)
    elif export_format == "stl":
        mesh.export(out_path, file_type="stl")
    elif export_format == "obj":
        mesh.export(out_path, file_type="obj")

    return out_path
