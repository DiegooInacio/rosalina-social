CREATE TABLE auth_refresh_session (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  current_token_id uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX idx_auth_session_user ON auth_refresh_session(user_id);
CREATE INDEX idx_auth_session_expiry ON auth_refresh_session(expires_at);
CREATE TABLE auth_login_limit (
  bucket varchar(64) PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL
);
CREATE INDEX idx_auth_limit_window ON auth_login_limit(window_start);

-- Force a fresh login: older refresh tokens have no session/rotation tracking.
UPDATE app_user SET session_version = session_version + 1;
