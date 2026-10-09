import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

function scryptAsync(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// Format: scrypt$N$r$p$saltBase64$hashBase64
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return ["scrypt", N, r, p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !N || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
