ALTER TABLE cases
    ADD COLUMN partner_id UUID NULL REFERENCES partners(id);

CREATE INDEX idx_cases_partner_id ON cases(partner_id);
