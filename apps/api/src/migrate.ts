import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pool } from "./db.js";

const migrationsDir = path.resolve(import.meta.dirname, "../migrations");

// Arbitrary constant so concurrent instances don't run migrations at the same time.
const LOCK_ID = 727_001;

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed`, { cause: err });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

// Allow running directly: `npm run migrate -w api`
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await migrate();
  await pool.end();
}
