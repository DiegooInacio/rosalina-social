ALTER TABLE audit_event
  ALTER COLUMN metadata TYPE TEXT USING metadata::text;
