
ALTER TABLE population_survey
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';

ALTER TABLE population_survey
ADD CONSTRAINT chk_population_survey_status
CHECK (status IN ('DRAFT', 'COMPLETED'));

CREATE INDEX idx_population_survey_status
ON population_survey (status);

ALTER TABLE population_survey
ADD COLUMN draft_data JSONB;

