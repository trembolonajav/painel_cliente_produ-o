CREATE TABLE patrimony_structures (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(20) NOT NULL,
    version INT NOT NULL,
    notes_internal TEXT NULL,
    notes_client TEXT NULL,
    original_document_name VARCHAR(255) NULL,
    original_document_mime_type VARCHAR(120) NULL,
    original_document_size_bytes BIGINT NULL,
    original_document_storage_key VARCHAR(512) NULL,
    original_document_visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_patrimony_structures_case_id ON patrimony_structures(case_id);

CREATE TABLE patrimony_nodes (
    id UUID PRIMARY KEY,
    structure_id UUID NOT NULL REFERENCES patrimony_structures(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    label VARCHAR(180) NOT NULL,
    subtitle VARCHAR(220) NULL,
    description TEXT NULL,
    value VARCHAR(120) NULL,
    percentage VARCHAR(40) NULL,
    location VARCHAR(220) NULL,
    parent_id UUID NULL REFERENCES patrimony_nodes(id) ON DELETE CASCADE,
    sort_order INT NOT NULL,
    is_visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
    metadata_json TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_patrimony_nodes_structure_id ON patrimony_nodes(structure_id);
CREATE INDEX idx_patrimony_nodes_parent_id ON patrimony_nodes(parent_id);
