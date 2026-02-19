import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { runMigrations } from "./db/index.js";
import signup from "./routes/signup.js";
import me from "./routes/me.js";
import friends from "./routes/friends.js";
import contacts from "./routes/contacts.js";
import messages from "./routes/messages.js";
import users from "./routes/users.js";

const app = new Hono();

app.use(logger());

app.get("/", (c) =>
  c.json({
    name: "ConnectClaw Relay",
    version: "0.2.0",
    host: process.env.RELAY_HOST ?? "localhost",
  })
);

app.route("/", signup);
app.route("/", me);
app.route("/", friends);
app.route("/", contacts);
app.route("/", messages);
app.route("/", users);

const port = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await runMigrations();
    console.log("[connectclaw] migrations applied");
  } catch {
    console.log("[connectclaw] no migrations folder yet, using push mode");
  }

  serve({ fetch: app.fetch, port }, () => {
    console.log(
      `[connectclaw] relay server running on http://localhost:${port}`
    );
  });
}

start();

export default app;
