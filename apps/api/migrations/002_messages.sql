-- Messages are only ever readable by their recipient. sender_id is kept so the
-- recipient can see who a message is from, but no query exposes a message to its sender.
CREATE TABLE messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX messages_recipient_created_idx ON messages (recipient_id, created_at DESC);
