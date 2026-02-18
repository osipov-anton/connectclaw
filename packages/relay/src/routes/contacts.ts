import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use(authMiddleware);

app.get("/contacts", async (c) => {
  const user = c.get("user");

  const rows = await db
    .select({
      id: schema.contacts.id,
      handle: schema.users.handle,
      displayName: schema.contacts.displayName,
      friendDisplayName: schema.users.displayName,
      createdAt: schema.contacts.createdAt,
    })
    .from(schema.contacts)
    .innerJoin(schema.users, eq(schema.users.id, schema.contacts.friendId))
    .where(eq(schema.contacts.userId, user.id))
    .all();

  const result = rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    displayName: r.displayName ?? r.friendDisplayName,
    createdAt: r.createdAt,
  }));

  return c.json({ contacts: result });
});

export default app;
