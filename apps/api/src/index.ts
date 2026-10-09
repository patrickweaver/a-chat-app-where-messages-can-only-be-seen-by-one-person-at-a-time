import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";

await migrate();

const server = createApp().listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

function shutdown() {
  server.close(() => void pool.end());
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
