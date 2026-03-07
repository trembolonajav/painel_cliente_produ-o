CREATE TABLE client_portal_sessions (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    session_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    ip VARCHAR(80) NULL,
    user_agent VARCHAR(512) NULL
);

CREATE INDEX idx_client_portal_sessions_client_id ON client_portal_sessions(client_id);
CREATE INDEX idx_client_portal_sessions_case_id ON client_portal_sessions(case_id);
CREATE INDEX idx_client_portal_sessions_expires_at ON client_portal_sessions(expires_at);
