"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { WhatsAppNotify } from "@/lib/types";
import { splitAmount } from "@/lib/utils";
import {
  buildDueWhatsAppMessage,
  buildWhatsAppUrl,
  phoneToWhatsAppDigits,
  resolveAppUrl,
} from "@/lib/whatsapp";
import type { ActionResult } from "./players";

export type CreateSessionResult =
  | { ok: true; notifies: WhatsAppNotify[] }
  | { ok: false; error: string };

export async function createSession(
  formData: FormData
): Promise<CreateSessionResult> {
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
  const playersRes = await db.execute({
    sql: `SELECT id, name, phone FROM players WHERE active = 1 AND id IN (${placeholders})`,
    args: playerIds,
  });
  if (playersRes.rows.length !== playerIds.length) {
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

  const appUrl = resolveAppUrl();
  const notifies: WhatsAppNotify[] = [];
  for (const row of playersRes.rows) {
    const phoneRaw = row.phone == null ? "" : String(row.phone);
    const digits = phoneToWhatsAppDigits(phoneRaw);
    if (!digits) continue;
    const name = String(row.name);
    const text = buildDueWhatsAppMessage({
      playerName: name,
      playDate,
      amount: share,
      appUrl,
    });
    notifies.push({
      playerId: Number(row.id),
      name,
      phoneDigits: digits,
      amount: share,
      playDate,
      waUrl: buildWhatsAppUrl(digits, text),
    });
  }

  notifies.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  revalidatePath("/");
  return { ok: true, notifies };
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
  await db.batch(
    [
      {
        sql: "UPDATE dues SET is_paid = 0 WHERE session_id = ?",
        args: [sessionId],
      },
      {
        // Unpaid dues must stay visible to visitors
        sql: "UPDATE sessions SET is_hidden = 0 WHERE id = ?",
        args: [sessionId],
      },
    ],
    "write"
  );

  revalidatePath("/");
  return { ok: true };
}

export async function hideSession(sessionId: number): Promise<ActionResult> {
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

  const unpaid = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM dues WHERE session_id = ? AND is_paid = 0",
    args: [sessionId],
  });
  const unpaidCount = Number(unpaid.rows[0]?.cnt ?? 0);
  if (unpaidCount > 0) {
    return { ok: false, error: "Hide only when every due in the column is paid." };
  }

  const duesCheck = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM dues WHERE session_id = ?",
    args: [sessionId],
  });
  if (Number(duesCheck.rows[0]?.cnt ?? 0) === 0) {
    return { ok: false, error: "Nothing to hide — this column has no dues." };
  }

  await db.execute({
    sql: "UPDATE sessions SET is_hidden = 1 WHERE id = ?",
    args: [sessionId],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function unhideSession(sessionId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return { ok: false, error: "Invalid session." };
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE sessions SET is_hidden = 0 WHERE id = ?",
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