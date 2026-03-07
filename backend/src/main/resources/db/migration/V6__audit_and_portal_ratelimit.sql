CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_type VARCHAR(20) NOT NULL,
    actor_id UUID NULL,
    entity VARCHAR(40) NOT NULL,
    entity_id UUID NULL,
    action VARCHAR(40) NOT NULL,
    details_json TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    ip VARCHAR(80) NULL,
    user_agent VARCHAR(512) NULL
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_type, actor_id);

ALTER TABLE case_portal_links
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN blocked_until TIMESTAMPTZ NULL;
