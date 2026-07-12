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

  await ensureMigrations(db);
}

async function addColumnIfMissing(
  db: Client,
  sql: string
): Promise<void> {
  try {
    await db.execute(sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/duplicate column/i.test(msg)) throw err;
  }
}

/** Idempotent column adds for DBs created before schema updates. */
export async function ensureMigrations(db: Client = getDb()): Promise<void> {
  await addColumnIfMissing(
    db,
    "ALTER TABLE sessions ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing(db, "ALTER TABLE players ADD COLUMN phone TEXT");
}
