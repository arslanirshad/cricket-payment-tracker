import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Missing TURSO_DATABASE_URL. Copy .env.example to .env.local and fill in values.");
  process.exit(1);
}

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const schema = readFileSync(resolve(process.cwd(), "src/lib/schema.sql"), "utf8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.execute(statement);
  }

  try {
    await db.execute(
      "ALTER TABLE sessions ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0"
    );
    console.log("Added sessions.is_hidden column.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/duplicate column/i.test(msg)) throw err;
  }

  console.log("Tables ensured.");

  const username = "arslan344";
  const password = "cricketaA!";
  const passwordHash = await bcrypt.hash(password, 12);

  await db.execute({
    sql: `
      INSERT INTO admin_users (username, password_hash)
      VALUES (?, ?)
      ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
    `,
    args: [username, passwordHash],
  });

  console.log(`Admin user "${username}" seeded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
