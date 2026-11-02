import { getSession } from "@/lib/auth";
import { getActivePlayers, getAllPlayers, getGridData } from "@/lib/data";
import { Header } from "@/components/Header";
import { DuesGrid } from "@/components/DuesGrid";
import { AdminPanel } from "@/components/AdminPanel";
import type { GridData, Player } from "@/lib/types";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  player?: string | string[];
  session?: string | string[];
};

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const focusPlayerId = parsePositiveInt(params.player);
  const focusSessionId = parsePositiveInt(params.session);
  const session = await getSession();
  const isAdmin = !!session;

  let grid: GridData = { players: [], sessions: [] };
  let activePlayers: Player[] = [];
  let allPlayers: Player[] = [];
  let loadError: string | null = null;

  try {
    grid = await getGridData(isAdmin);
    if (isAdmin) {
      [activePlayers, allPlayers] = await Promise.all([
        getActivePlayers(),
        getAllPlayers(),
      ]);
    }
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Could not load data. Check Turso env vars and run npm run seed.";
  }

  return (
    <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      <Header isAdmin={isAdmin} username={session?.username} />

      {loadError && (
        <div className="mb-4 rounded-lg border border-[var(--unpaid-bg)] bg-[var(--unpaid-bg)] px-4 py-3 text-sm text-[var(--unpaid-fg)]">
          {loadError}
        </div>
      )}

      <DuesGrid
        data={grid}
        isAdmin={isAdmin}
        focusPlayerId={focusPlayerId}
        focusSessionId={focusSessionId}
      />

      {isAdmin && (
        <AdminPanel activePlayers={activePlayers} allPlayers={allPlayers} />
      )}
    </main>
  );
}
