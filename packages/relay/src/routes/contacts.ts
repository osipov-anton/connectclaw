import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
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

app.delete("/contacts/:handle", async (c) => {
  const user = c.get("user");
  const handle = c.req.param("handle")?.trim().toLowerCase();

  if (!handle) {
    return c.json({ error: "handle is required" }, 400);
  }

  const target = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .get();

  if (!target) {
    return c.json({ error: "User not found." }, 404);
  }

  const contact = await db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, user.id),
        eq(schema.contacts.friendId, target.id)
      )
    )
    .get();

  if (!contact) {
    return c.json({ error: "Not in your contacts." }, 404);
  }

  await db
    .delete(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, user.id),
        eq(schema.contacts.friendId, target.id)
      )
    );

  await db
    .delete(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, target.id),
        eq(schema.contacts.friendId, user.id)
      )
    );

  return c.json({ status: "removed", handle });
});

export default app;
