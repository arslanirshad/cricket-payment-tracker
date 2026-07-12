import type { Player } from "@/lib/types";
import { AddSessionForm } from "./AddSessionForm";
import { PlayersAdmin } from "./PlayersAdmin";

type Props = {
  activePlayers: Player[];
  allPlayers: Player[];
};

export function AdminPanel({ activePlayers, allPlayers }: Props) {
  return (
    <section className="mt-8 space-y-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-[var(--ink)]">Admin</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Manage players and record match fees. Tap a cell on the grid to toggle paid.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Add payment
        </h3>
        <AddSessionForm activePlayers={activePlayers} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Players
        </h3>
        <PlayersAdmin players={allPlayers} />
      </div>
    </section>
  );
}
