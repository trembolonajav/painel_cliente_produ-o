CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE office_users (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE clients (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    cpf_encrypted VARCHAR(255) NULL,
    cpf_last3 VARCHAR(3) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(30) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_cpf_last3 ON clients(cpf_last3);

CREATE TABLE cases (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id),
    title VARCHAR(200) NOT NULL,
    case_number VARCHAR(100) NULL,
    area VARCHAR(80) NULL,
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(10) NOT NULL,
    created_by UUID NOT NULL REFERENCES office_users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_updated_at ON cases(updated_at DESC);
