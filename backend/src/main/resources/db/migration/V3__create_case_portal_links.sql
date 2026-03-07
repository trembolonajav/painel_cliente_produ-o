CREATE TABLE case_portal_links (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES office_users(id),
    created_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    last_access_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_case_portal_links_case_id ON case_portal_links(case_id);
CREATE INDEX idx_case_portal_links_status ON case_portal_links(status);
CREATE INDEX idx_case_portal_links_expires_at ON case_portal_links(expires_at);
CREATE UNIQUE INDEX uq_case_portal_links_active_case
    ON case_portal_links(case_id)
    WHERE status = 'ACTIVE';
