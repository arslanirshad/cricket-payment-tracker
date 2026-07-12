"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthResult } from "@/app/actions/auth";

const initial: AuthResult | null = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Admin login</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--muted)]">
          Sign in to manage players and dues.
        </p>

        <form action={formAction} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Username</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-[var(--unpaid-fg)]">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Back to dues board
          </Link>
        </p>
      </div>
    </main>
  );
}
