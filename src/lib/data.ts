import { ensureMigrations, getDb } from "@/lib/db";
import type { Due, GridData, Player, Session } from "@/lib/types";

function mapPlayerRow(r: Record<string, unknown>): Player {
  const phoneRaw = r.phone;
  return {
    id: Number(r.id),
    name: String(r.name),
    phone: phoneRaw == null || phoneRaw === "" ? null : String(phoneRaw),
    active: Number(r.active),
    created_at: String(r.created_at),
  };
}

export async function getGridData(includeHidden = false): Promise<GridData> {
  const db = getDb();
  await ensureMigrations(db);

  const [playersRes, sessionsRes, duesRes] = await Promise.all([
    db.execute(
      "SELECT id, name, phone, active, created_at FROM players ORDER BY name COLLATE NOCASE"
    ),
    db.execute(
      includeHidden
        ? "SELECT id, play_date, total_amount, is_hidden, created_at FROM sessions ORDER BY play_date ASC, id ASC"
        : "SELECT id, play_date, total_amount, is_hidden, created_at FROM sessions WHERE is_hidden = 0 ORDER BY play_date ASC, id ASC"
    ),
    db.execute("SELECT id, session_id, player_id, amount, is_paid FROM dues"),
  ]);

  const players = playersRes.rows.map((r) =>
    mapPlayerRow(r as Record<string, unknown>)
  );

  const sessions = sessionsRes.rows.map((r) => ({
    id: Number(r.id),
    play_date: String(r.play_date),
    total_amount: Number(r.total_amount),
    is_hidden: Number(r.is_hidden ?? 0),
    created_at: String(r.created_at),
  })) as Session[];

  const sessionIds = new Set(sessions.map((s) => s.id));

  const dues = duesRes.rows.map((r) => ({
    id: Number(r.id),
    session_id: Number(r.session_id),
    player_id: Number(r.player_id),
    amount: Number(r.amount),
    is_paid: Number(r.is_paid),
  })) as Due[];

  const duesByPlayer = new Map<number, Due[]>();
  for (const due of dues) {
    const list = duesByPlayer.get(due.player_id) ?? [];
    list.push(due);
    duesByPlayer.set(due.player_id, list);
  }

  const visiblePlayers = players.filter((p) => {
    if (p.active === 1) return true;
    const list = duesByPlayer.get(p.id) ?? [];
    return list.some((d) => sessionIds.has(d.session_id));
  });

  const gridPlayers = visiblePlayers.map((player) => {
    const list = duesByPlayer.get(player.id) ?? [];
    const cells: Record<number, { dueId: number; amount: number; isPaid: boolean } | null> = {};
    for (const session of sessions) {
      cells[session.id] = null;
    }
    let unpaidTotal = 0;
    for (const due of list) {
      if (!sessionIds.has(due.session_id)) continue;
      cells[due.session_id] = {
        dueId: due.id,
        amount: due.amount,
        isPaid: due.is_paid === 1,
      };
      if (due.is_paid !== 1) unpaidTotal += due.amount;
    }
    return { ...player, unpaidTotal, cells };
  });

  return { players: gridPlayers, sessions };
}

export async function getActivePlayers(): Promise<Player[]> {
  const db = getDb();
  await ensureMigrations(db);
  const res = await db.execute(
    "SELECT id, name, phone, active, created_at FROM players WHERE active = 1 ORDER BY name COLLATE NOCASE"
  );
  return res.rows.map((r) => mapPlayerRow(r as Record<string, unknown>));
}

export async function getAllPlayers(): Promise<Player[]> {
  const db = getDb();
  await ensureMigrations(db);
  const res = await db.execute(
    "SELECT id, name, phone, active, created_at FROM players ORDER BY active DESC, name COLLATE NOCASE"
  );
  return res.rows.map((r) => mapPlayerRow(r as Record<string, unknown>));
}
