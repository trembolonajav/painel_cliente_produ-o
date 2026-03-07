CREATE TABLE case_stages (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    position INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_case_stages_case_id ON case_stages(case_id);
CREATE INDEX idx_case_stages_case_position ON case_stages(case_id, position);

CREATE TABLE case_tasks (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    stage_id UUID NULL REFERENCES case_stages(id) ON DELETE SET NULL,
    title VARCHAR(220) NOT NULL,
    description TEXT NULL,
    due_date DATE NULL,
    status VARCHAR(20) NOT NULL,
    assigned_to UUID NULL REFERENCES office_users(id),
    created_by UUID NOT NULL REFERENCES office_users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_case_tasks_case_id ON case_tasks(case_id);
CREATE INDEX idx_case_tasks_stage_id ON case_tasks(stage_id);
