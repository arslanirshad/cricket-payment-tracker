"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  markSessionAllPaid,
  markSessionAllUnpaid,
  deleteSession,
  hideSession,
  unhideSession,
} from "@/app/actions/sessions";
import { setCellAmount, toggleDuePaid } from "@/app/actions/dues";
import { TextFilter } from "@/components/TextFilter";
import type { DueCell, GridData } from "@/lib/types";
import { formatCompactSessionDate, formatRs, formatSessionHeader } from "@/lib/utils";

type Props = {
  data: GridData;
  isAdmin: boolean;
  focusPlayerId?: number | null;
  focusSessionId?: number | null;
};

const HIGHLIGHT_MS = 4000;

function cellMarker(playerId: number, sessionId: number) {
  return {
    "data-player-id": playerId,
    "data-session-id": sessionId,
  };
}

const amountCol = "w-[5.75rem] min-w-[5.75rem] max-w-[5.75rem]";
const nameCol = "max-w-[42vw] md:max-w-none";

function focusClass(on: boolean): string {
  return on ? " due-focus" : "";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Scroll a grid cell into the sticky-aware viewport. Instant assignment avoids
 * iOS Safari dropping horizontal scroll when smooth scrollBy would clamp on Y. */
function scrollCellIntoFocus(container: HTMLElement, cell: HTMLElement) {
  container.scrollIntoView({ block: "nearest", inline: "nearest" });

  const cRect = container.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const cornerTh = container.querySelector<HTMLElement>("thead th");
  const footerTd = container.querySelector<HTMLElement>("tfoot td");
  const nameRect = cornerTh?.getBoundingClientRect();
  const footerRect = footerTd?.getBoundingClientRect();

  const scrollportLeft = cRect.left + container.clientLeft;
  const scrollportTop = cRect.top + container.clientTop;
  const scrollportRight = scrollportLeft + container.clientWidth;
  const scrollportBottom = scrollportTop + container.clientHeight;

  const footerHeight = footerRect?.height ?? 0;
  const visibleLeft = Math.max(nameRect?.right ?? scrollportLeft, scrollportLeft);
  const visibleRight = scrollportRight;
  const visibleTop = Math.max(nameRect?.bottom ?? scrollportTop, scrollportTop);
  const stickyFooterTop =
    footerRect && footerRect.top < scrollportBottom
      ? footerRect.top
      : scrollportBottom - footerHeight;
  const visibleBottom = Math.min(stickyFooterTop, scrollportBottom);
  const visibleWidth = Math.max(visibleRight - visibleLeft, 1);
  const visibleHeight = Math.max(visibleBottom - visibleTop, 1);

  const deltaLeft =
    cellRect.left + cellRect.width / 2 - (visibleLeft + visibleWidth / 2);
  const deltaTop =
    cellRect.top + cellRect.height / 2 - (visibleTop + visibleHeight / 2);

  const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
  const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);

  container.scrollLeft = clamp(container.scrollLeft + deltaLeft, 0, maxLeft);
  container.scrollTop = clamp(container.scrollTop + deltaTop, 0, maxTop);
}

type EditingCell = {
  playerId: number;
  sessionId: number;
};

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.921-.922l.93-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.262a.25.25 0 0 0 0-.354l-1.086-1.086ZM9.75 4.811 3.802 10.76a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l5.948-5.949-1.44-1.439Z" />
    </svg>
  );
}

export function DuesGrid({
  data,
  isAdmin,
  focusPlayerId = null,
  focusSessionId = null,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [playerFilter, setPlayerFilter] = useState("");
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draft, setDraft] = useState("");
  const [highlightOn, setHighlightOn] = useState(
    () => focusPlayerId != null && focusSessionId != null
  );
  const skipBlurSaveRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { players, sessions } = data;

  useEffect(() => {
    if (focusPlayerId == null || focusSessionId == null) return;
    setHighlightOn(true);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setHighlightOn(false), HIGHLIGHT_MS));

    let cancelled = false;
    let attempts = 0;
    let frame2 = 0;

    const tryScroll = () => {
      if (cancelled) return;
      const container = scrollRef.current;
      if (!container) return;
      const cell = container.querySelector<HTMLElement>(
        `td[data-player-id="${focusPlayerId}"][data-session-id="${focusSessionId}"]`
      );
      if (!cell) {
        if (attempts++ < 12) {
          timers.push(window.setTimeout(tryScroll, 50));
        }
        return;
      }

      scrollCellIntoFocus(container, cell);
      // Second pass after sticky headers / iOS chrome settle.
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) scrollCellIntoFocus(container, cell);
        }, 120)
      );
    };

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(tryScroll);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      for (const id of timers) window.clearTimeout(id);
    };
  }, [focusPlayerId, focusSessionId]);

  function isFocusedCell(playerId: number, sessionId: number): boolean {
    return (
      highlightOn &&
      playerId === focusPlayerId &&
      sessionId === focusSessionId
    );
  }

  const filteredPlayers = useMemo(() => {
    const q = playerFilter.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, playerFilter]);

  const sessionUnpaidTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const session of sessions) {
      let sum = 0;
      for (const player of filteredPlayers) {
        const cell = player.cells[session.id];
        if (cell && !cell.isPaid) sum += cell.amount;
      }
      totals.set(session.id, sum);
    }
    return totals;
  }, [filteredPlayers, sessions]);

  const grandUnpaidTotal = useMemo(
    () => filteredPlayers.reduce((sum, player) => sum + player.unpaidTotal, 0),
    [filteredPlayers]
  );

  function sessionAllPaid(sessionId: number): boolean {
    const dues = players
      .map((p) => p.cells[sessionId])
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    return dues.length > 0 && dues.every((cell) => cell.isPaid);
  }

  function onToggle(dueId: number) {
    if (!isAdmin || editing) return;
    startTransition(async () => {
      await toggleDuePaid(dueId);
    });
  }

  function startEdit(
    playerId: number,
    sessionId: number,
    cell: DueCell | null
  ) {
    if (!isAdmin) return;
    skipBlurSaveRef.current = false;
    setEditing({ playerId, sessionId });
    setDraft(cell ? String(cell.amount) : "");
  }

  function cancelEdit() {
    skipBlurSaveRef.current = true;
    setEditing(null);
    setDraft("");
  }

  function saveEdit() {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    if (!editing) return;
    const { playerId, sessionId } = editing;
    const trimmed = draft.trim();

    let amount: number | null;
    if (trimmed === "") {
      amount = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n <= 0) {
        window.alert("Enter a positive whole number, or leave empty to clear.");
        return;
      }
      amount = n;
    }

    setEditing(null);
    setDraft("");
    startTransition(async () => {
      const result = await setCellAmount(sessionId, playerId, amount);
      if (!result.ok) {
        window.alert(result.error);
      }
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

  function renderAdminCell(
    playerId: number,
    sessionId: number,
    cell: DueCell | null
  ) {
    const isEditing =
      editing?.playerId === playerId && editing?.sessionId === sessionId;

    if (isEditing) {
      return (
        <td
          key={sessionId}
          {...cellMarker(playerId, sessionId)}
          className={`border-b border-[var(--border)] px-1 py-1 text-center ${amountCol}`}
        >
          <input
            type="number"
            min={1}
            step={1}
            autoFocus
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            onBlur={() => saveEdit()}
            aria-label="Edit amount"
            className={`w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-center text-sm font-medium tabular-nums text-[var(--ink)] outline-none focus:border-[var(--accent)]${focusClass(isFocusedCell(playerId, sessionId))}`}
          />
        </td>
      );
    }

    const paid = cell?.isPaid ?? false;

    return (
      <td
        key={sessionId}
        {...cellMarker(playerId, sessionId)}
        className={`group/cell relative z-0 border-b border-[var(--border)] px-1 py-1 text-center ${amountCol}`}
      >
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            startEdit(playerId, sessionId, cell);
          }}
          title="Edit amount"
          aria-label="Edit amount"
          className="absolute top-0.5 right-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded bg-[var(--surface)]/90 text-[var(--muted)] opacity-100 shadow-sm transition hover:text-[var(--accent)] focus-visible:opacity-100 md:opacity-0 md:group-hover/cell:opacity-100"
        >
          <PencilIcon className="h-3 w-3" />
        </button>

        {cell ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onToggle(cell.dueId)}
            title={paid ? "Mark unpaid" : "Mark paid"}
            className={`w-full rounded-md py-1 pl-1 pr-4 text-center text-sm font-medium tabular-nums transition disabled:opacity-50 ${
              paid
                ? "bg-[var(--paid-bg)] text-[var(--paid-fg)] hover:brightness-95"
                : "bg-[var(--unpaid-bg)] text-[var(--unpaid-fg)] hover:brightness-95"
            }${focusClass(isFocusedCell(playerId, sessionId))}`}
          >
            {formatRs(cell.amount)}
          </button>
        ) : (
          <span
            className={`inline-block w-full rounded-md px-1 py-1 text-[var(--muted)]${focusClass(isFocusedCell(playerId, sessionId))}`}
          >
            —
          </span>
        )}
      </td>
    );
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

      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm max-h-[calc(100vh-12rem)]"
      >
        <table className="w-max border-collapse text-sm">
          <thead>
            <tr>
              <th
                className={`sticky left-0 top-0 z-30 bg-[var(--header-bg)] px-2 py-2 text-left font-semibold text-[var(--ink)] border-b border-r border-[var(--border)] md:px-2.5 ${nameCol}`}
              >
                Player
              </th>
              {sessions.map((session) => {
                const allPaid = sessionAllPaid(session.id);
                const hidden = session.is_hidden === 1;
                return (
                  <th
                    key={session.id}
                    className={`sticky top-0 z-20 bg-[var(--header-bg)] px-1 py-1.5 text-center font-medium text-[var(--ink)] border-b border-[var(--border)] ${amountCol}`}
                  >
                    <div className={hidden ? "opacity-60" : undefined}>
                    <div className="text-xs leading-tight">
                      {formatCompactSessionDate(session.play_date)}
                    </div>
                    <div className="text-[10px] font-normal leading-tight text-[var(--muted)]">
                      {formatRs(session.total_amount)}
                    </div>
                    {hidden && (
                      <div
                        title="Hidden from visitors"
                        className="text-[10px] font-normal uppercase tracking-wide text-[var(--muted)]"
                      >
                        Hidden
                      </div>
                    )}
                    {isAdmin && (
                      <div className="mt-1 flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          disabled={pending}
                          title={allPaid ? "Mark all unpaid" : "Mark all paid"}
                          onClick={() =>
                            allPaid
                              ? onMarkAllUnpaid(session.id)
                              : onMarkAllPaid(session.id)
                          }
                          className="whitespace-nowrap text-[10px] font-normal leading-tight text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          {allPaid ? "All unpaid" : "All paid"}
                        </button>
                        {hidden ? (
                          <button
                            type="button"
                            disabled={pending}
                            title="Show column"
                            onClick={() => onUnhideSession(session.id)}
                            className="whitespace-nowrap text-[10px] font-normal leading-tight text-[var(--accent)] hover:underline disabled:opacity-50"
                          >
                            Show
                          </button>
                        ) : (
                          allPaid && (
                            <button
                              type="button"
                              disabled={pending}
                              title="Hide from visitors"
                              onClick={() => onHideSession(session.id)}
                              className="whitespace-nowrap text-[10px] font-normal leading-tight text-[var(--accent)] hover:underline disabled:opacity-50"
                            >
                              Hide
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          title="Delete column"
                          onClick={() =>
                            onDeleteSession(
                              session.id,
                              formatSessionHeader(session.play_date, session.total_amount)
                            )
                          }
                          className="whitespace-nowrap text-[10px] font-normal leading-tight text-[var(--unpaid-fg)] hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    </div>
                  </th>
                );
              })}
              <th
                className={`sticky top-0 z-20 bg-[var(--header-bg)] border-b border-l border-[var(--border)] px-1 py-1.5 text-right text-xs font-semibold text-[var(--ink)] ${amountCol}`}
              >
                Unpaid
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player.id} className="group hover:bg-[var(--row-hover)]">
                <td
                  title={player.name}
                  className={`sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--row-hover)] px-2 py-1.5 font-medium text-[var(--ink)] border-b border-r border-[var(--border)] md:px-2.5 ${nameCol}`}
                >
                  <span className="block max-w-full truncate">{player.name}</span>
                  {player.active !== 1 && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      inactive
                    </span>
                  )}
                </td>
                {sessions.map((session) => {
                  const cell = player.cells[session.id];

                  if (isAdmin) {
                    return renderAdminCell(player.id, session.id, cell);
                  }

                  if (!cell) {
                    return (
                      <td
                        key={session.id}
                        {...cellMarker(player.id, session.id)}
                        className={`border-b border-[var(--border)] px-1 py-1 text-center text-[var(--muted)] ${amountCol}${focusClass(isFocusedCell(player.id, session.id))}`}
                      >
                        —
                      </td>
                    );
                  }

                  const paid = cell.isPaid;
                  return (
                    <td
                      key={session.id}
                      {...cellMarker(player.id, session.id)}
                      className={`border-b border-[var(--border)] px-1 py-1 text-center ${amountCol}`}
                    >
                      <span
                        className={`inline-block w-full rounded-md px-1 py-1 text-center text-sm font-medium tabular-nums ${
                          paid
                            ? "bg-[var(--paid-bg)] text-[var(--paid-fg)]"
                            : "bg-[var(--unpaid-bg)] text-[var(--unpaid-fg)]"
                        }${focusClass(isFocusedCell(player.id, session.id))}`}
                      >
                        {formatRs(cell.amount)}
                      </span>
                    </td>
                  );
                })}
                <td
                  className={`border-b border-l border-[var(--border)] px-1 py-1.5 text-right text-sm font-semibold tabular-nums ${amountCol} ${
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
          <tfoot>
            <tr>
              <td
                className={`sticky left-0 bottom-0 z-30 bg-[var(--header-bg)] px-2 py-2 text-left font-semibold text-[var(--ink)] border-t border-r border-[var(--border)] md:px-2.5 ${nameCol}`}
              >
                Total due
              </td>
              {sessions.map((session) => {
                const total = sessionUnpaidTotals.get(session.id) ?? 0;
                return (
                  <td
                    key={session.id}
                    className={`sticky bottom-0 z-20 bg-[var(--header-bg)] border-t border-[var(--border)] px-1 py-2 text-center text-xs font-semibold tabular-nums ${amountCol} ${
                      total > 0
                        ? "text-[var(--unpaid-fg)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {formatRs(total)}
                  </td>
                );
              })}
              <td
                className={`sticky bottom-0 z-20 bg-[var(--header-bg)] border-t border-l border-[var(--border)] px-1 py-2 text-right text-xs font-semibold tabular-nums ${amountCol} ${
                  grandUnpaidTotal > 0
                    ? "text-[var(--unpaid-fg)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {formatRs(grandUnpaidTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
