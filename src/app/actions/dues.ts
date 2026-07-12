"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ActionResult } from "./players";

export async function toggleDuePaid(dueId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT is_paid FROM dues WHERE id = ?",
    args: [dueId],
  });
  const row = existing.rows[0];
  if (!row) return { ok: false, error: "Due not found." };

  const next = Number(row.is_paid) === 1 ? 0 : 1;
  await db.execute({
    sql: "UPDATE dues SET is_paid = ? WHERE id = ?",
    args: [next, dueId],
  });

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
  await db.execute({
    sql: "UPDATE dues SET is_paid = ? WHERE id = ?",
    args: [isPaid ? 1 : 0, dueId],
  });

  revalidatePath("/");
  return { ok: true };
}
