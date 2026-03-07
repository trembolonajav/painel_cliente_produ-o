ALTER TABLE documents
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE documents
    ALTER COLUMN storage_key DROP NOT NULL;

CREATE INDEX idx_documents_status ON documents(status);
