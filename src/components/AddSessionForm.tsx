"use client";

import { useMemo, useState, useTransition } from "react";
import { createSession } from "@/app/actions/sessions";
import { TextFilter } from "@/components/TextFilter";
import type { Player } from "@/lib/types";
import { formatRs, splitAmount, todayISO } from "@/lib/utils";

type Props = {
  activePlayers: Player[];
};

export function AddSessionForm({ activePlayers }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [selected, setSelected] = useState<number[]>(() =>
    activePlayers.map((p) => p.id)
  );

  const visiblePlayers = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    if (!q) return activePlayers;
    return activePlayers.filter((p) => p.name.toLowerCase().includes(q));
  }, [activePlayers, nameFilter]);

  const share = useMemo(() => {
    const t = Number.parseInt(total, 10);
    if (!Number.isFinite(t) || t <= 0 || selected.length === 0) return null;
    return splitAmount(t, selected.length);
  }, [total, selected]);

  function togglePlayer(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function checkAll() {
    setSelected(activePlayers.map((p) => p.id));
  }

  function uncheckAll() {
    setSelected([]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const form = e.currentTarget;
    const playDate = String(new FormData(form).get("play_date") ?? "");
    const totalAmount = Number.parseInt(total, 10);
    const names = activePlayers
      .filter((p) => selected.includes(p.id))
      .map((p) => p.name)
      .join(", ");
    const perPlayer = share !== null ? formatRs(share) : "n/a";
    const summary =
      `Add payment for ${playDate}?\n` +
      `Total: ${formatRs(totalAmount)} among ${selected.length} player(s) (${perPlayer} each).\n` +
      `Players: ${names}`;

    if (!window.confirm(summary)) return;

    const formData = new FormData(form);
    for (const id of selected) {
      formData.append("player_ids", String(id));
    }
    startTransition(async () => {
      const result = await createSession(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Payment session added.");
      setTotal("");
      setNameFilter("");
      setSelected(activePlayers.map((p) => p.id));
      form.reset();
    });
  }

  if (activePlayers.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add active players before recording a payment session.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Play date</span>
          <input
            type="date"
            name="play_date"
            defaultValue={todayISO()}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Total amount (Rs)</span>
          <input
            type="number"
            name="total_amount"
            min={1}
            step={1}
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm text-[var(--muted)]">Players who played</legend>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={checkAll}
              className="text-[var(--accent)] hover:underline"
            >
              Check all
            </button>
            <span className="text-[var(--border)]">|</span>
            <button
              type="button"
              onClick={uncheckAll}
              className="text-[var(--accent)] hover:underline"
            >
              Uncheck all
            </button>
          </div>
          <TextFilter
            id="session-player-filter"
            value={nameFilter}
            onChange={setNameFilter}
            placeholder="Filter players…"
            inputClassName="bg-white"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {visiblePlayers.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => togglePlayer(p.id)}
              />
              {p.name}
            </label>
          ))}
          {visiblePlayers.length === 0 && (
            <p className="text-sm text-[var(--muted)] sm:col-span-2">
              No players match &quot;{nameFilter}&quot;.
            </p>
          )}
        </div>
      </fieldset>

      {share !== null && (
        <p className="text-sm text-[var(--muted)]">
          Each selected player: <span className="font-medium text-[var(--ink)]">Rs {share}</span>{" "}
          (ceil split)
        </p>
      )}

      {error && <p className="text-sm text-[var(--unpaid-fg)]">{error}</p>}
      {message && <p className="text-sm text-[var(--paid-fg)]">{message}</p>}

      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Add payment"}
      </button>
    </form>
  );
}
