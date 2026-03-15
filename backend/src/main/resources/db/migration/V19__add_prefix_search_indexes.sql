CREATE INDEX IF NOT EXISTS idx_cases_title_lower_prefix
    ON cases (lower(title) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_cases_case_number_lower_prefix
    ON cases (lower(case_number) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_clients_name_lower_prefix
    ON clients (lower(name) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_lower_prefix
    ON clients (lower(email) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_clients_phone_prefix
    ON clients (phone text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_partners_name_lower_prefix
    ON partners (lower(name) text_pattern_ops);
