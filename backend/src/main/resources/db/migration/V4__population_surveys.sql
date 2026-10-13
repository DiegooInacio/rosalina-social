CREATE TABLE population_survey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_date DATE NOT NULL,
  responsible_name VARCHAR(150) NOT NULL,
  responsible_cpf VARCHAR(11),
  data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_population_responsible_name ON population_survey (lower(responsible_name));
CREATE INDEX idx_population_responsible_cpf ON population_survey (responsible_cpf);

CREATE TABLE population_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES population_survey(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  name VARCHAR(150) NOT NULL,
  document_type VARCHAR(10) CHECK (document_type IN ('CPF', 'CIN')),
  document_number VARCHAR(30),
  age INTEGER CHECK (age >= 0),
  birth_date DATE,
  kinship VARCHAR(100),
  income NUMERIC(12,2) CHECK (income >= 0),
  is_responsible BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_population_member_survey ON population_member (survey_id);
