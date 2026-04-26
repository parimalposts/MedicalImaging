CREATE TABLE IF NOT EXISTS studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_uid TEXT UNIQUE NOT NULL,
    patient_name TEXT,
    patient_id TEXT,
    study_date TEXT,
    study_description TEXT,
    modality TEXT,
    path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_uid TEXT UNIQUE NOT NULL,
    study_uid TEXT NOT NULL REFERENCES studies(study_uid),
    series_description TEXT,
    num_slices INTEGER,
    modality TEXT,
    path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_uid TEXT REFERENCES series(series_uid),
    format TEXT NOT NULL CHECK(format IN ('seg_nrrd','nii_gz','dicom_seg')),
    path TEXT NOT NULL,
    filename TEXT NOT NULL,
    label_count INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qa_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotation_id INTEGER NOT NULL REFERENCES annotations(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','flagged')),
    reviewer TEXT,
    reviewer_notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qa_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotation_id INTEGER NOT NULL REFERENCES annotations(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    reviewer TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mesh_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotation_id INTEGER NOT NULL REFERENCES annotations(id),
    label_index INTEGER NOT NULL DEFAULT 1,
    smoothing_iterations INTEGER DEFAULT 5,
    export_format TEXT NOT NULL DEFAULT 'glb' CHECK(export_format IN ('glb','stl','obj')),
    output_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','error')),
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
)
