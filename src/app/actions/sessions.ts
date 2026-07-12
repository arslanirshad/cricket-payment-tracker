"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { splitAmount } from "@/lib/utils";
import type { ActionResult } from "./players";

export async function createSession(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const playDate = String(formData.get("play_date") ?? "").trim();
  const totalRaw = String(formData.get("total_amount") ?? "").trim();
  const totalAmount = Number.parseInt(totalRaw, 10);

  const playerIds = [
    ...new Set(
      formData
        .getAll("player_ids")
        .map((v) => Number.parseInt(String(v), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
    return { ok: false, error: "Valid play date is required." };
  }
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { ok: false, error: "Total amount must be a positive integer." };
  }
  if (playerIds.length === 0) {
    return { ok: false, error: "Select at least one player." };
  }

  const db = getDb();
  const placeholders = playerIds.map(() => "?").join(", ");
  const activeCheck = await db.execute({
    sql: `SELECT id FROM players WHERE active = 1 AND id IN (${placeholders})`,
    args: playerIds,
  });
  if (activeCheck.rows.length !== playerIds.length) {
    return { ok: false, error: "All selected players must be active." };
  }

  const share = splitAmount(totalAmount, playerIds.length);

  const insert = await db.execute({
    sql: "INSERT INTO sessions (play_date, total_amount) VALUES (?, ?)",
    args: [playDate, totalAmount],
  });

  const sessionId = Number(insert.lastInsertRowid);
  if (!sessionId) {
    return { ok: false, error: "Failed to create session." };
  }

  await db.batch(
    playerIds.map((playerId) => ({
      sql: "INSERT INTO dues (session_id, player_id, amount, is_paid) VALUES (?, ?, ?, 0)",
      args: [sessionId, playerId, share],
    })),
    "write"
  );

  revalidatePath("/");
  return { ok: true };
}

export async function markSessionAllPaid(sessionId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE dues SET is_paid = 1 WHERE session_id = ?",
    args: [sessionId],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function markSessionAllUnpaid(sessionId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE dues SET is_paid = 0 WHERE session_id = ?",
    args: [sessionId],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function deleteSession(sessionId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return { ok: false, error: "Invalid session." };
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM sessions WHERE id = ?",
    args: [sessionId],
  });
  if (!existing.rows[0]) {
    return { ok: false, error: "Session not found." };
  }

  // Delete dues first (FK cascade may not be enabled on Turso)
  await db.batch(
    [
      {
        sql: "DELETE FROM dues WHERE session_id = ?",
        args: [sessionId],
      },
      {
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [sessionId],
      },
    ],
    "write"
  );

  revalidatePath("/");
  return { ok: true };
}