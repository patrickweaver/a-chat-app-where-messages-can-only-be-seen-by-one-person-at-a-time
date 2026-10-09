import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { pool } from "../db.js";

export const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface User {
  id: string;
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") {
    await pool.query("DELETE FROM sessions WHERE id = $1", [hashToken(token)]);
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

// Rejects requests without a logged-in user. Use after loadUser.
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  next();
}

// Populates req.user when the request carries a valid session cookie.
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") {
    const { rows } = await pool.query<User>(
      `SELECT u.id, u.username, u.email
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    );
    req.user = rows[0];
  }
  next();
}
