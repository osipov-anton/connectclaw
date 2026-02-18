import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  tokenHash: text("token_hash").notNull(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const friendRequests = sqliteTable("friend_requests", {
  id: text("id").primaryKey(),
  fromId: text("from_id")
    .notNull()
    .references(() => users.id),
  toId: text("to_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  friendId: text("friend_id")
    .notNull()
    .references(() => users.id),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  fromId: text("from_id")
    .notNull()
    .references(() => users.id),
  toId: text("to_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  deliveredAt: integer("delivered_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
