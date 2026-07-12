import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return client;
}

export async function ensureSchema(db: Client = getDb()): Promise<void> {
  const schemaPath = join(process.cwd(), "src", "lib", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.execute(statement);
  }
}
