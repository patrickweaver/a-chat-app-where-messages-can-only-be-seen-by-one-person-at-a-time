-- Forwarding moves a message to a new recipient: sender_id becomes the forwarder and
-- recipient_id the new holder, so only one person ever has the message.
-- author_id records who originally wrote it. It is never shown to recipients.
ALTER TABLE messages ADD COLUMN author_id uuid REFERENCES users (id) ON DELETE CASCADE;
UPDATE messages SET author_id = sender_id;
ALTER TABLE messages ALTER COLUMN author_id SET NOT NULL;

-- When the current recipient received the message (the original send or the latest forward).
ALTER TABLE messages ADD COLUMN delivered_at timestamptz NOT NULL DEFAULT now();
UPDATE messages SET delivered_at = created_at;

DROP INDEX messages_recipient_created_idx;
CREATE INDEX messages_recipient_delivered_idx ON messages (recipient_id, delivered_at DESC);

-- One row per forward: the emoji the forwarder attached. Ordered by id.
CREATE TABLE message_reactions (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_reactions_message_idx ON message_reactions (message_id, id);
