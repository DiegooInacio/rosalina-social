CREATE TABLE form_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES app_user(id),
  form_type VARCHAR(30) NOT NULL CHECK (form_type IN ('STUDENT', 'POPULATION_SURVEY')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COMPLETED')),
  title VARCHAR(150),
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  record_id UUID,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'DRAFT' AND record_id IS NULL) OR (status = 'COMPLETED' AND record_id IS NOT NULL))
);

CREATE INDEX idx_form_draft_owner_pending ON form_draft(owner_id, form_type, updated_at DESC)
  WHERE status = 'DRAFT';
