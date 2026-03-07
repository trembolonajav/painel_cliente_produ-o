CREATE TABLE case_updates (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    visibility VARCHAR(20) NOT NULL,
    type VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES office_users(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_case_updates_case_id ON case_updates(case_id);
CREATE INDEX idx_case_updates_visibility ON case_updates(visibility);
CREATE INDEX idx_case_updates_created_at ON case_updates(created_at DESC);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES office_users(id),
    visibility VARCHAR(20) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    checksum VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
