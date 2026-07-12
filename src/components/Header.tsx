import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

type Props = {
  isAdmin: boolean;
  username?: string;
};

export function Header({ isAdmin, username }: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Cricket Dues
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Match fees - unpaid and paid at a glance
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {isAdmin ? (
          <>
            <span className="text-[var(--muted)]">Signed in as {username}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--row-hover)]"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            Admin login
          </Link>
        )}
      </div>
    </header>
  );
}