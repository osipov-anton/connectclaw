import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/connectclaw.db";

if (dbUrl.startsWith("file:")) {
  mkdirSync(dirname(dbUrl.slice(5)), { recursive: true });
}

const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export { schema };
