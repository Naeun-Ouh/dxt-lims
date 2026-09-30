BEGIN;
CREATE TABLE saved_analysis (
  id uuid PRIMARY KEY,
  domain_id text NOT NULL UNIQUE,
  study_id uuid NOT NULL REFERENCES study(study_id),
  version bigint NOT NULL CHECK (version >= 0),
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Historical scientific identities deliberately survive unavailable sources.
-- Only configuration ownership is enforced by FK; never cascade to Measurement.
CREATE TABLE saved_analysis_source_ref (
  saved_analysis_id uuid NOT NULL REFERENCES saved_analysis(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  study_domain_id text NOT NULL,
  run_domain_id text NOT NULL,
  subject_domain_id text NOT NULL,
  execution_domain_id text,
  dataset_domain_id text NOT NULL,
  parameter_domain_id text NOT NULL,
  representative_domain_id text,
  PRIMARY KEY (saved_analysis_id, ordinal)
);
CREATE INDEX saved_analysis_study ON saved_analysis(study_id);
CREATE TABLE saved_analysis_command_receipt (
  saved_analysis_id uuid NOT NULL REFERENCES saved_analysis(id),
  command_id text NOT NULL,
  request_hash text NOT NULL,
  successful_version bigint NOT NULL CHECK (successful_version > 0),
  PRIMARY KEY (saved_analysis_id, command_id)
);
COMMIT;
