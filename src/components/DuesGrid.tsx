"use client";

import { useMemo, useState, useTransition } from "react";
import {
  markSessionAllPaid,
  markSessionAllUnpaid,
  deleteSession,
  hideSession,
  unhideSession,
} from "@/app/actions/sessions";
import { toggleDuePaid } from "@/app/actions/dues";
import { TextFilter } from "@/components/TextFilter";
import type { GridData } from "@/lib/types";
import { formatRs, formatSessionHeader } from "@/lib/utils";

type Props = {
  data: GridData;
  isAdmin: boolean;
};

export function DuesGrid({ data, isAdmin }: Props) {
  const [pending, startTransition] = useTransition();
  const [playerFilter, setPlayerFilter] = useState("");
  const { players, sessions } = data;

  const filteredPlayers = useMemo(() => {
    const q = playerFilter.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, playerFilter]);

  function sessionAllPaid(sessionId: number): boolean {
    const dues = players
      .map((p) => p.cells[sessionId])
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    return dues.length > 0 && dues.every((cell) => cell.isPaid);
  }

  function onToggle(dueId: number) {
    if (!isAdmin) return;
    startTransition(async () => {
      await toggleDuePaid(dueId);
    });
  }

  function onMarkAllPaid(sessionId: number) {
    if (!isAdmin) return;
    startTransition(async () => {
      await markSessionAllPaid(sessionId);
    });
  }

  function onMarkAllUnpaid(sessionId: number) {
    if (!isAdmin) return;
    startTransition(async () => {
      await markSessionAllUnpaid(sessionId);
    });
  }

  function onHideSession(sessionId: number) {
    if (!isAdmin) return;
    startTransition(async () => {
      await hideSession(sessionId);
    });
  }

  function onUnhideSession(sessionId: number) {
    if (!isAdmin) return;
    startTransition(async () => {
      await unhideSession(sessionId);
    });
  }

  function onDeleteSession(sessionId: number, label: string) {
    if (!isAdmin) return;
    const ok = window.confirm(
      `Delete the entire column for ${label}?\nAll player dues for that date will be removed. You can re-add it later if needed.`
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteSession(sessionId);
    });
  }

  if (players.length === 0 && sessions.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center text-[var(--muted)]">
        No players or sessions yet. Sign in as admin to add them.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TextFilter
          id="player-filter"
          label="Filter by player"
          value={playerFilter}
          onChange={setPlayerFilter}
          placeholder="Type a player name…"
        />
      </div>

      <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm max-h-[calc(100vh-12rem)]">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-[var(--header-bg)] px-3 py-3 text-left font-semibold text-[var(--ink)] border-b border-r border-[var(--border)] min-w-[9rem]">
                Player
              </th>
              {sessions.map((session) => {
                const allPaid = sessionAllPaid(session.id);
                const hidden = session.is_hidden === 1;
                return (
                  <th
                    key={session.id}
                    className={`sticky top-0 z-20 bg-[var(--header-bg)] px-2 py-2 text-center font-medium text-[var(--ink)] border-b border-[var(--border)] min-w-[7.5rem] whitespace-nowrap ${
                      hidden ? "opacity-60" : ""
                    }`}
                  >
                    <div>{formatSessionHeader(session.play_date, session.total_amount)}</div>
                    {hidden && (
                      <div className="text-[10px] font-normal uppercase tracking-wide text-[var(--muted)]">
                        Hidden from visitors
                      </div>
                    )}
                    {isAdmin && (
                      <div className="mt-1 flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            allPaid
                              ? onMarkAllUnpaid(session.id)
                              : onMarkAllPaid(session.id)
                          }
                          className="text-[10px] font-normal text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          {allPaid ? "Mark all unpaid" : "Mark all paid"}
                        </button>
                        {hidden ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onUnhideSession(session.id)}
                            className="text-[10px] font-normal text-[var(--accent)] hover:underline disabled:opacity-50"
                          >
                            Show column
                          </button>
                        ) : (
                          allPaid && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => onHideSession(session.id)}
                              className="text-[10px] font-normal text-[var(--accent)] hover:underline disabled:opacity-50"
                            >
                              Hide from visitors
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            onDeleteSession(
                              session.id,
                              formatSessionHeader(session.play_date, session.total_amount)
                            )
                          }
                          className="text-[10px] font-normal text-[var(--unpaid-fg)] hover:underline disabled:opacity-50"
                        >
                          Delete column
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="sticky top-0 z-20 bg-[var(--header-bg)] px-3 py-3 text-right font-semibold text-[var(--ink)] border-b border-l border-[var(--border)] min-w-[6.5rem] whitespace-nowrap">
                Unpaid
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player.id} className="group hover:bg-[var(--row-hover)]">
                <td className="sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--row-hover)] px-3 py-2 font-medium text-[var(--ink)] border-b border-r border-[var(--border)] whitespace-nowrap">
                  {player.name}
                  {player.active !== 1 && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      inactive
                    </span>
                  )}
                </td>
                {sessions.map((session) => {
                  const cell = player.cells[session.id];
                  if (!cell) {
                    return (
                      <td
                        key={session.id}
                        className="border-b border-[var(--border)] px-2 py-2 text-center text-[var(--muted)]"
                      >
                        —
                      </td>
                    );
                  }
                  const paid = cell.isPaid;
                  return (
                    <td
                      key={session.id}
                      className="border-b border-[var(--border)] px-1 py-1 text-center"
                    >
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onToggle(cell.dueId)}
                          title={paid ? "Mark unpaid" : "Mark paid"}
                          className={`w-full rounded-md px-2 py-1.5 font-medium tabular-nums transition disabled:opacity-50 ${
                            paid
                              ? "bg-[var(--paid-bg)] text-[var(--paid-fg)] hover:brightness-95"
                              : "bg-[var(--unpaid-bg)] text-[var(--unpaid-fg)] hover:brightness-95"
                          }`}
                        >
                          {formatRs(cell.amount)}
                        </button>
                      ) : (
                        <span
                          className={`inline-block w-full rounded-md px-2 py-1.5 font-medium tabular-nums ${
                            paid
                              ? "bg-[var(--paid-bg)] text-[var(--paid-fg)]"
                              : "bg-[var(--unpaid-bg)] text-[var(--unpaid-fg)]"
                          }`}
                        >
                          {formatRs(cell.amount)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td
                  className={`border-b border-l border-[var(--border)] px-3 py-2 text-right font-semibold tabular-nums ${
                    player.unpaidTotal > 0
                      ? "text-[var(--unpaid-fg)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {formatRs(player.unpaidTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
