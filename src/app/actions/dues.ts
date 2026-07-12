"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ActionResult } from "./players";

async function unhideSessionIfUnpaid(
  db: ReturnType<typeof getDb>,
  sessionId: number,
  isPaid: number
): Promise<void> {
  if (isPaid !== 0) return;
  await db.execute({
    sql: "UPDATE sessions SET is_hidden = 0 WHERE id = ?",
    args: [sessionId],
  });
}

export async function toggleDuePaid(dueId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT is_paid, session_id FROM dues WHERE id = ?",
    args: [dueId],
  });
  const row = existing.rows[0];
  if (!row) return { ok: false, error: "Due not found." };

  const next = Number(row.is_paid) === 1 ? 0 : 1;
  const sessionId = Number(row.session_id);

  await db.execute({
    sql: "UPDATE dues SET is_paid = ? WHERE id = ?",
    args: [next, dueId],
  });
  await unhideSessionIfUnpaid(db, sessionId, next);

  revalidatePath("/");
  return { ok: true };
}

export async function setDuePaid(
  dueId: number,
  isPaid: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT session_id FROM dues WHERE id = ?",
    args: [dueId],
  });
  const row = existing.rows[0];
  if (!row) return { ok: false, error: "Due not found." };

  const next = isPaid ? 1 : 0;
  await db.execute({
    sql: "UPDATE dues SET is_paid = ? WHERE id = ?",
    args: [next, dueId],
  });
  await unhideSessionIfUnpaid(db, Number(row.session_id), next);

  revalidatePath("/");
  return { ok: true };
}
