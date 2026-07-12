"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { ok: false, error: "Username and password are required." };
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
    args: [username],
  });

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Invalid username or password." };
  }

  const passwordHash = String(row.password_hash);
  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid username or password." };
  }

  const token = await createSessionToken(String(row.username));
  await setSessionCookie(token);
  // redirect() throws; satisfies AuthResult return type for TS
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
