import path from "node:path";
import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import { loadUser } from "./auth/sessions.js";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { messagesRouter } from "./routes/messages.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  api.use(loadUser);
  api.use("/auth", authRouter);
  api.use("/messages", messagesRouter);
  api.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });
  app.use("/api", api);

  if (config.staticDir) {
    const staticDir = path.resolve(config.staticDir);
    app.use(express.static(staticDir));
    // Single-page app fallback: let the client router handle unknown paths.
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: status === 500 ? "Something went wrong." : err.message });
  };
  app.use(errorHandler);

  return app;
}
