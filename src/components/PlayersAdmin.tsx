"use client";

import { useState, useTransition } from "react";
import {
  createPlayer,
  deactivatePlayer,
  reactivatePlayer,
  updatePlayer,
} from "@/app/actions/players";
import type { Player } from "@/lib/types";

type Props = {
  players: Player[];
};

export function PlayersAdmin({ players }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createPlayer(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
    });
  }

  function onUpdate(playerId: number, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayer(playerId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function onDeactivate(player: Player) {
    if (
      !window.confirm(
        `Deactivate ${player.name}? They will be hidden from new payments but remain on the board if they have dues.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deactivatePlayer(player.id);
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="New player name"
          className="min-w-[10rem] flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone (+92…)"
          className="min-w-[10rem] flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add player
        </button>
      </form>

      {error && <p className="text-sm text-[var(--unpaid-fg)]">{error}</p>}

      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white">
        {players.length === 0 && (
          <li className="px-3 py-4 text-sm text-[var(--muted)]">No players yet.</li>
        )}
        {players.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
          >
            {editingId === p.id ? (
              <form
                className="flex flex-1 flex-wrap gap-2"
                action={(fd) => onUpdate(p.id, fd)}
              >
                <input
                  name="name"
                  defaultValue={p.name}
                  required
                  className="min-w-[8rem] flex-1 rounded border border-[var(--border)] px-2 py-1"
                />
                <input
                  name="phone"
                  type="tel"
                  defaultValue={p.phone ?? ""}
                  placeholder="Phone (+92…)"
                  className="min-w-[8rem] flex-1 rounded border border-[var(--border)] px-2 py-1"
                />
                <button type="submit" disabled={pending} className="text-[var(--accent)]">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-[var(--muted)]"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div>
                  <span className="font-medium text-[var(--ink)]">{p.name}</span>
                  {p.phone ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">{p.phone}</span>
                  ) : (
                    <span className="ml-2 text-xs text-[var(--muted)]">no phone</span>
                  )}
                  {p.active !== 1 && (
                    <span className="ml-2 text-xs text-[var(--muted)]">inactive</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-[var(--accent)] hover:underline"
                    onClick={() => setEditingId(p.id)}
                  >
                    Edit
                  </button>
                  {p.active === 1 ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-[var(--unpaid-fg)] hover:underline disabled:opacity-50"
                      onClick={() => onDeactivate(p)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-[var(--paid-fg)] hover:underline disabled:opacity-50"
                      onClick={() =>
                        startTransition(async () => {
                          await reactivatePlayer(p.id);
                        })
                      }
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
