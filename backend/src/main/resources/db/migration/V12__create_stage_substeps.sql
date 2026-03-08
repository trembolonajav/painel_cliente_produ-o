CREATE TABLE case_stage_substeps (
    id UUID PRIMARY KEY,
    stage_id UUID NOT NULL REFERENCES case_stages(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    position INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_case_stage_substeps_stage_id ON case_stage_substeps(stage_id);
CREATE INDEX idx_case_stage_substeps_stage_position ON case_stage_substeps(stage_id, position);
