"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900 p-7 shadow-raised ring-1 ring-black/40"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-white">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-white/15 bg-ink-950 px-3.5 py-3 text-sm text-white outline-none transition-all duration-150 focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-white">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-white/15 bg-ink-950 px-3.5 py-3 text-sm text-white outline-none transition-all duration-150 focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/20"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="press-feedback mt-2 flex items-center justify-center gap-2 rounded-lg bg-brand-electric px-6 py-3 text-sm font-bold text-white shadow-electric transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
      >
        {loading && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
