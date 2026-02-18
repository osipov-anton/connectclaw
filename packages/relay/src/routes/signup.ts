import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db/index.js";
import { hashToken, getRelayAccessToken } from "../lib/auth.js";

const app = new Hono();

app.post("/signup", async (c) => {
  const body = await c.req.json<{ handle?: string; accessToken?: string }>();
  const handle = body.handle?.trim().toLowerCase();

  if (!handle || !/^[a-z0-9_]{2,32}$/.test(handle)) {
    return c.json(
      {
        error:
          "Invalid handle. Use 2-32 characters: lowercase letters, numbers, underscores.",
      },
      400
    );
  }

  const requiredAccessToken = getRelayAccessToken();
  if (requiredAccessToken) {
    if (body.accessToken !== requiredAccessToken) {
      return c.json(
        { error: "This relay requires a valid access token to sign up." },
        403
      );
    }
  }

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .get();

  if (existing) {
    return c.json({ error: "Handle already taken." }, 409);
  }

  const token = randomUUID();
  const id = randomUUID();

  await db.insert(schema.users).values({
    id,
    handle,
    tokenHash: await hashToken(token),
    createdAt: Date.now(),
  });

  return c.json({ token, handle }, 201);
});

export default app;
