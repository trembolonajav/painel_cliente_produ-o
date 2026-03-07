CREATE TABLE document_download_tokens (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_id UUID NULL
);

CREATE INDEX idx_document_download_tokens_document_id ON document_download_tokens(document_id);
CREATE INDEX idx_document_download_tokens_expires_at ON document_download_tokens(expires_at);
