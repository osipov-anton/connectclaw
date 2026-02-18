import { createMiddleware } from "hono/factory";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, schema } from "../db/index.js";

const scryptAsync = promisify(scrypt);

type UserRow = typeof schema.users.$inferSelect;

declare module "hono" {
  interface ContextVariableMap {
    user: UserRow;
  }
}

export async function hashToken(token: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(token, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyToken(
  storedHash: string,
  token: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(token, salt, 64)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, hashBuffer);
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = header.slice(7);
  const allUsers = await db.select().from(schema.users);

  for (const user of allUsers) {
    if (await verifyToken(user.tokenHash, token)) {
      c.set("user", user);
      return next();
    }
  }

  return c.json({ error: "Invalid token" }, 401);
});

export function getRelayAccessToken(): string | undefined {
  const val = process.env.RELAY_ACCESS_TOKEN;
  return val && val.trim() !== "" ? val.trim() : undefined;
}

export function getRelayHost(): string {
  return process.env.RELAY_HOST ?? "localhost";
}
