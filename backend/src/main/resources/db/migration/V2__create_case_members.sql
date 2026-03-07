CREATE TABLE case_members (
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES office_users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (case_id, user_id)
);

CREATE INDEX idx_case_members_user_id ON case_members(user_id);
CREATE INDEX idx_case_members_case_id ON case_members(case_id);
