import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use(authMiddleware);

app.get("/me", (c) => {
  const user = c.get("user");
  return c.json({
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    createdAt: user.createdAt,
  });
});

export default app;
