CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','OPERADOR')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, name)
);

CREATE TABLE student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(10) NOT NULL CHECK (status IN ('ATIVO','INATIVO')),
  name VARCHAR(150) NOT NULL,
  activity_id UUID NOT NULL REFERENCES catalog_item(id),
  birth_date DATE NOT NULL,
  rg VARCHAR(30),
  cpf VARCHAR(11),
  cadunico BOOLEAN,
  nis VARCHAR(20),
  national_health_card VARCHAR(20),
  address VARCHAR(255),
  neighborhood VARCHAR(120),
  reference_point VARCHAR(255),
  city VARCHAR(120),
  zip_code VARCHAR(8),
  start_date DATE,
  guardian_phone VARCHAR(20) NOT NULL,
  guardian_email VARCHAR(254),
  student_phone VARCHAR(20),
  student_email VARCHAR(254),
  parents_relationship_status VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_student_cpf_not_null ON student(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_student_name ON student USING gin (to_tsvector('portuguese', name));
CREATE INDEX idx_student_status ON student(status);

CREATE TABLE student_relative (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  type VARCHAR(15) NOT NULL CHECK (type IN ('PAI','MAE','RESPONSAVEL')),
  kinship VARCHAR(100),
  name VARCHAR(150) NOT NULL,
  birth_date DATE,
  occupation_id UUID REFERENCES catalog_item(id),
  literate BOOLEAN,
  education_id UUID REFERENCES catalog_item(id),
  phone VARCHAR(20),
  rg VARCHAR(30),
  cpf VARCHAR(11),
  voter_registration VARCHAR(30),
  UNIQUE(student_id, type)
);

CREATE TABLE socioeconomic_profile (
  student_id UUID PRIMARY KEY REFERENCES student(id) ON DELETE CASCADE,
  housing_type_id UUID REFERENCES catalog_item(id),
  acquisition_type_id UUID REFERENCES catalog_item(id),
  wall_type_id UUID REFERENCES catalog_item(id),
  floor_type_id UUID REFERENCES catalog_item(id),
  has_electricity BOOLEAN,
  water_supply_id UUID REFERENCES catalog_item(id),
  sewage_id UUID REFERENCES catalog_item(id),
  garbage_collection_id UUID REFERENCES catalog_item(id),
  water_expense NUMERIC(12,2),
  electricity_expense NUMERIC(12,2),
  phone_expense NUMERIC(12,2),
  rent_or_financing_expense NUMERIC(12,2),
  food_expense NUMERIC(12,2),
  household_income NUMERIC(12,2),
  has_other_assets BOOLEAN,
  has_other_property BOOLEAN,
  has_vehicle BOOLEAN,
  receives_bolsa_familia BOOLEAN,
  receives_bpc BOOLEAN,
  receives_retirement BOOLEAN
);

CREATE TABLE audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES app_user(id),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_audit_entity ON audit_event(entity_type, entity_id);
