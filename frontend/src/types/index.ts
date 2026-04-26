export interface DicomTag {
  tag: string;
  keyword: string;
  vr: string;
  value: string;
}

export interface SeriesResponse {
  series_uid: string;
  study_uid: string;
  series_description: string | null;
  num_slices: number;
  modality: string | null;
  path: string;
}

export interface StudyResponse {
  study_uid: string;
  patient_name: string | null;
  patient_id: string | null;
  study_date: string | null;
  study_description: string | null;
  modality: string | null;
  series: SeriesResponse[];
}

export type SegFormat = "seg_nrrd" | "nii_gz" | "dicom_seg";

export interface LabelInfo {
  label_value: number;
  name: string;
  color_rgb: [number, number, number] | null;
}

export interface AnnotationResponse {
  id: number;
  series_uid: string | null;
  format: SegFormat;
  filename: string;
  label_count: number;
  labels: LabelInfo[];
  uploaded_at: string;
}

export type ExportFormat = "glb" | "stl" | "obj";

export interface MeshJobResponse {
  id: number;
  annotation_id: number;
  label_index: number;
  smoothing_iterations: number;
  export_format: string;
  status: "pending" | "processing" | "done" | "error";
  output_path: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export type QAStatus = "pending" | "approved" | "rejected" | "flagged";

export interface QARecordResponse {
  id: number;
  annotation_id: number;
  status: QAStatus;
  reviewer: string | null;
  reviewer_notes: string | null;
  updated_at: string;
}

export interface QAStatsResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
}
