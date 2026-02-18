import { Hono } from "hono";
import { eq, and, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use(authMiddleware);

app.post("/friends/request", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ handle?: string }>();
  const handle = body.handle?.trim().toLowerCase();

  if (!handle) {
    return c.json({ error: "handle is required" }, 400);
  }

  if (handle === user.handle) {
    return c.json({ error: "Cannot send a friend request to yourself." }, 400);
  }

  const target = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .get();

  if (!target) {
    return c.json({ error: "User not found." }, 404);
  }

  const existingContact = await db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, user.id),
        eq(schema.contacts.friendId, target.id)
      )
    )
    .get();

  if (existingContact) {
    return c.json({ error: "Already friends." }, 409);
  }

  const existingRequest = await db
    .select()
    .from(schema.friendRequests)
    .where(
      and(
        or(
          and(
            eq(schema.friendRequests.fromId, user.id),
            eq(schema.friendRequests.toId, target.id)
          ),
          and(
            eq(schema.friendRequests.fromId, target.id),
            eq(schema.friendRequests.toId, user.id)
          )
        ),
        eq(schema.friendRequests.status, "pending")
      )
    )
    .get();

  if (existingRequest) {
    return c.json({ error: "A pending friend request already exists." }, 409);
  }

  const id = randomUUID();
  await db.insert(schema.friendRequests).values({
    id,
    fromId: user.id,
    toId: target.id,
    status: "pending",
    createdAt: Date.now(),
  });

  return c.json({ id, to: handle, status: "pending" }, 201);
});

app.get("/friends/requests", async (c) => {
  const user = c.get("user");

  const incoming = await db
    .select({
      id: schema.friendRequests.id,
      fromHandle: schema.users.handle,
      fromDisplayName: schema.users.displayName,
      status: schema.friendRequests.status,
      createdAt: schema.friendRequests.createdAt,
    })
    .from(schema.friendRequests)
    .innerJoin(schema.users, eq(schema.users.id, schema.friendRequests.fromId))
    .where(
      and(
        eq(schema.friendRequests.toId, user.id),
        eq(schema.friendRequests.status, "pending")
      )
    )
    .all();

  const outgoing = await db
    .select({
      id: schema.friendRequests.id,
      toHandle: schema.users.handle,
      toDisplayName: schema.users.displayName,
      status: schema.friendRequests.status,
      createdAt: schema.friendRequests.createdAt,
    })
    .from(schema.friendRequests)
    .innerJoin(schema.users, eq(schema.users.id, schema.friendRequests.toId))
    .where(
      and(
        eq(schema.friendRequests.fromId, user.id),
        eq(schema.friendRequests.status, "pending")
      )
    )
    .all();

  return c.json({ incoming, outgoing });
});

app.post("/friends/accept", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ handle?: string }>();
  const handle = body.handle?.trim().toLowerCase();

  if (!handle) {
    return c.json({ error: "handle is required" }, 400);
  }

  const sender = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .get();

  if (!sender) {
    return c.json({ error: "User not found." }, 404);
  }

  const request = await db
    .select()
    .from(schema.friendRequests)
    .where(
      and(
        eq(schema.friendRequests.fromId, sender.id),
        eq(schema.friendRequests.toId, user.id),
        eq(schema.friendRequests.status, "pending")
      )
    )
    .get();

  if (!request) {
    return c.json(
      { error: "No pending friend request from this user." },
      404
    );
  }

  const now = Date.now();

  await db
    .update(schema.friendRequests)
    .set({ status: "accepted" })
    .where(eq(schema.friendRequests.id, request.id));

  await db.insert(schema.contacts).values([
    {
      id: randomUUID(),
      userId: user.id,
      friendId: sender.id,
      createdAt: now,
    },
    {
      id: randomUUID(),
      userId: sender.id,
      friendId: user.id,
      createdAt: now,
    },
  ]);

  return c.json({ status: "accepted", handle });
});

app.post("/friends/reject", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ handle?: string }>();
  const handle = body.handle?.trim().toLowerCase();

  if (!handle) {
    return c.json({ error: "handle is required" }, 400);
  }

  const sender = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .get();

  if (!sender) {
    return c.json({ error: "User not found." }, 404);
  }

  const request = await db
    .select()
    .from(schema.friendRequests)
    .where(
      and(
        eq(schema.friendRequests.fromId, sender.id),
        eq(schema.friendRequests.toId, user.id),
        eq(schema.friendRequests.status, "pending")
      )
    )
    .get();

  if (!request) {
    return c.json(
      { error: "No pending friend request from this user." },
      404
    );
  }

  await db
    .update(schema.friendRequests)
    .set({ status: "rejected" })
    .where(eq(schema.friendRequests.id, request.id));

  return c.json({ status: "rejected", handle });
});

export default app;
