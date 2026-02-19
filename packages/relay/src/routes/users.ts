import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use(authMiddleware);

app.get("/users/:handle", async (c) => {
  const user = c.get("user");
  const handle = c.req.param("handle")?.trim().toLowerCase();

  if (!handle) {
    return c.json({ error: "handle is required" }, 400);
  }

  const target = await db
    .select({ id: schema.users.id, handle: schema.users.handle, displayName: schema.users.displayName })
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

  return c.json({
    handle: target.handle,
    displayName: target.displayName,
    isContact: !!contact,
  });
});

export default app;
