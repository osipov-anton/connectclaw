import { Hono } from "hono";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../lib/auth.js";

const MAX_MESSAGE_LENGTH = 4096;

const app = new Hono();

app.use(authMiddleware);

app.post("/messages/send", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ contactId?: string; content?: string }>();

  if (!body.contactId || !body.content?.trim()) {
    return c.json({ error: "contactId and content are required" }, 400);
  }

  const trimmed = body.content.trim();
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return c.json(
      { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` },
      400
    );
  }

  const contact = await db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.id, body.contactId),
        eq(schema.contacts.userId, user.id)
      )
    )
    .get();

  if (!contact) {
    return c.json({ error: "Contact not found." }, 404);
  }

  const id = randomUUID();
  await db.insert(schema.messages).values({
    id,
    fromId: user.id,
    toId: contact.friendId,
    content: trimmed,
    createdAt: Date.now(),
  });

  return c.json({ id, status: "sent" }, 201);
});

function inboxQuery(userId: string) {
  return db
    .select({
      id: schema.messages.id,
      fromHandle: schema.users.handle,
      content: schema.messages.content,
      createdAt: schema.messages.createdAt,
    })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.users.id, schema.messages.fromId))
    .innerJoin(
      schema.contacts,
      and(
        eq(schema.contacts.userId, schema.messages.toId),
        eq(schema.contacts.friendId, schema.messages.fromId)
      )
    )
    .where(
      and(eq(schema.messages.toId, userId), isNull(schema.messages.deliveredAt))
    );
}

app.get("/messages/inbox", async (c) => {
  const user = c.get("user");
  const rows = await inboxQuery(user.id).all();
  return c.json({ messages: rows });
});

app.get("/messages/poll", async (c) => {
  const user = c.get("user");
  const timeout = Math.min(Number(c.req.query("timeout") ?? 30), 60);
  const interval = 1000;
  const deadline = Date.now() + timeout * 1000;

  while (Date.now() < deadline) {
    const rows = await inboxQuery(user.id).all();

    if (rows.length > 0) {
      return c.json({ messages: rows });
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  return c.json({ messages: [] });
});

app.post("/messages/ack", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ messageIds?: string[] }>();

  if (!body.messageIds?.length) {
    return c.json({ error: "messageIds array is required" }, 400);
  }

  await db
    .update(schema.messages)
    .set({ deliveredAt: Date.now() })
    .where(
      and(
        eq(schema.messages.toId, user.id),
        inArray(schema.messages.id, body.messageIds)
      )
    );

  return c.json({ acknowledged: body.messageIds.length });
});

export default app;
