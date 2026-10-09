CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- id is a SHA-256 hash of the session token stored in the user's cookie,
-- so a leaked database doesn't expose usable session tokens.
CREATE TABLE sessions (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
