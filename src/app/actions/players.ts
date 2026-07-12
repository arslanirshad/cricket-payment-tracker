"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseOptionalPhone } from "@/lib/whatsapp";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPlayer(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const phoneResult = parseOptionalPhone(String(formData.get("phone") ?? ""));
  if (!phoneResult.ok) return phoneResult;

  const db = getDb();
  await db.execute({
    sql: "INSERT INTO players (name, phone, active) VALUES (?, ?, 1)",
    args: [name, phoneResult.phone],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function deactivatePlayer(playerId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE players SET active = 0 WHERE id = ?",
    args: [playerId],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function reactivatePlayer(playerId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE players SET active = 1 WHERE id = ?",
    args: [playerId],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function updatePlayer(
  playerId: number,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const phoneResult = parseOptionalPhone(String(formData.get("phone") ?? ""));
  if (!phoneResult.ok) return phoneResult;

  const db = getDb();
  await db.execute({
    sql: "UPDATE players SET name = ?, phone = ? WHERE id = ?",
    args: [name, phoneResult.phone, playerId],
  });

  revalidatePath("/");
  return { ok: true };
}
