import type {
  AnnotationResponse,
  DicomTag,
  ExportFormat,
  MeshJobResponse,
  QARecordResponse,
  QAStatus,
  QAStatsResponse,
  StudyResponse,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── DICOM ─────────────────────────────────────────────────────────────────────
export const dicomApi = {
  listStudies: () => get<StudyResponse[]>("/api/dicom/studies"),
  getMetadata: (seriesUid: string) =>
    get<DicomTag[]>(`/api/dicom/series/${seriesUid}/metadata`),
  getSliceCount: (seriesUid: string) =>
    get<{ count: number }>(`/api/dicom/series/${seriesUid}/slice-count`),
  frameUrl: (seriesUid: string, index: number) =>
    `${BASE}/api/dicom/frame/${seriesUid}/${index}`,
};

// ── Segmentation ──────────────────────────────────────────────────────────────
export const segApi = {
  list: () => get<AnnotationResponse[]>("/api/segmentation/"),
  get: (id: number) => get<AnnotationResponse>(`/api/segmentation/${id}`),
  upload: async (file: File, seriesUid = "") => {
    const form = new FormData();
    form.append("file", file);
    form.append("series_uid", seriesUid);
    const res = await fetch(`${BASE}/api/segmentation/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<AnnotationResponse>;
  },
  sliceUrl: (id: number, axis: string, idx: number, label?: number) => {
    const params = new URLSearchParams({ axis, idx: String(idx) });
    if (label !== undefined) params.set("label", String(label));
    return `${BASE}/api/segmentation/${id}/slice?${params}`;
  },
  convert: (id: number, target: string) =>
    post<{ output_path: string; format: string }>(
      `/api/segmentation/${id}/convert?target=${target}`,
      {}
    ),
};

// ── Mesh ──────────────────────────────────────────────────────────────────────
export const meshApi = {
  listJobs: () => get<MeshJobResponse[]>("/api/mesh/jobs"),
  generate: (body: {
    annotation_id: number;
    label_index: number;
    smoothing_iterations: number;
    export_format: ExportFormat;
  }) => post<MeshJobResponse>("/api/mesh/generate", body),
  getJob: (id: number) => get<MeshJobResponse>(`/api/mesh/${id}`),
  downloadUrl: (id: number) => `${BASE}/api/mesh/${id}/download`,
};

// ── QA ────────────────────────────────────────────────────────────────────────
export const qaApi = {
  list: (status?: QAStatus, seriesUid?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (seriesUid) params.set("series_uid", seriesUid);
    return get<QARecordResponse[]>(`/api/qa/annotations?${params}`);
  },
  review: (annotationId: number, body: { status: QAStatus; reviewer: string; notes?: string }) =>
    post<QARecordResponse>(`/api/qa/annotations/${annotationId}/review`, body),
  stats: () => get<QAStatsResponse>("/api/qa/stats"),
};
