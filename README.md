# a-chat-app-where-messages-can-only-be-seen-by-one-person-at-a-time

Monorepo (npm workspaces):

| Path       | What                                                        |
| ---------- | ----------------------------------------------------------- |
| `apps/api` | Express 5 + TypeScript API, Postgres via `pg`               |
| `apps/web` | React + TypeScript client (Vite, React Router)              |

## Running locally

Requires Docker.

```sh
docker compose up --watch
```

Open http://localhost:5173. Compose starts Postgres, the API (`tsx watch`) and the Vite dev server.
With `--watch`, edits under `apps/*/src` sync into the containers and hot-reload; changes to a
`package.json` or `package-lock.json` rebuild the image.

- The browser only talks to Vite, which proxies `/api/*` to the API container. The API isn't published to the host.
- Postgres is published on `localhost:5433` (user/password/db: `chat`): `psql postgres://chat:chat@localhost:5433/chat`
- Port clash? Override with `WEB_HOST_PORT=5180 DB_HOST_PORT=5434 docker compose up --watch`.
- Reset the database: `docker compose down -v`.

Install dependencies on the host too (Node 24, see `.nvmrc`) so your editor gets types: `npm install`.
To add a dependency, run `npm install <pkg> -w api` (or `-w web`); Compose rebuilds automatically.

## API

All routes are under `/api`. Auth uses an opaque session token in an `HttpOnly`, `SameSite=Lax`
cookie (`Secure` in production). Sessions are stored hashed in the `sessions` table and last 30 days.

| Method | Path               | Body                            | Response                 |
| ------ | ------------------ | ------------------------------- | ------------------------ |
| POST   | `/api/auth/signup` | `{ username, email, password }` | `201 { user }`, sets cookie |
| POST   | `/api/auth/login`  | `{ username, password }`        | `200 { user }`, sets cookie |
| POST   | `/api/auth/logout` |                                 | `204`, clears cookie     |
| GET    | `/api/auth/me`     |                                 | `200 { user }` or `401`  |
| POST   | `/api/messages`     | `{ to: username, body }`        | `204`                    |
| GET    | `/api/messages`     |                                 | `200 { messages: [{ id, fromUsername, receivedAt }] }` |
| GET    | `/api/messages/:id` |                                 | `200 { message: { id, fromUsername, body, receivedAt, latestReaction, earlierReactions } }` |
| POST   | `/api/messages/:id/forward` | `{ to: username, reaction: emoji }` | `204`              |
| GET    | `/api/health`      |                                 | `200 { ok: true }`       |

Errors are returned as `{ error: string }`. `/api/messages` routes require a logged-in user.

Messages are visible only to their recipient. The sender can't list or read a message after sending
it, and sending doesn't echo the message back. The inbox lists each message on its own, with no
threads or conversations.

Forwarding moves a message to someone else along with a single emoji reaction, so it leaves the
forwarder's inbox. The recipient sees it as from the forwarder, never from the original author
(`author_id` is stored but never exposed). `latestReaction` is the reaction from the most recent
forward (shown above the message). `earlierReactions` lists the reactions from earlier forwards,
oldest first (shown below it).

## Database migrations

Plain SQL files in `apps/api/migrations`, applied in filename order when the API starts
(tracked in `schema_migrations`). To add one, create the next numbered file, e.g.
`002_add_messages.sql`. You can also run them manually with `npm run migrate -w api`.

## Deploying to Render

`render.yaml` is a [Blueprint](https://render.com/docs/blueprint-spec) defining:

- `chat-db`: a Postgres database
- `chat`: a Docker web service built from the root `Dockerfile` (final `prod` stage). It serves both
  the API and the built client from one origin, so the session cookie works without any CORS or
  cross-site cookie setup.

In the Render dashboard choose **New → Blueprint** and point it at this repo. Both use the `free`
plan. Free Render Postgres databases expire after a trial period, so upgrade the `plan` before you rely on it.
