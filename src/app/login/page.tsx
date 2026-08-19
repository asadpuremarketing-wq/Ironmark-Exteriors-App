import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      {/* Ambient brand glow — restrained, no orange, just electric blue
          radiating from two corners so the black background feels
          intentional rather than empty. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-brand-electric/25 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-brand-electric-light/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-electric to-brand-electric-light shadow-electric">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8h16v11H4V8zm4-4h8v4H8V4zm-4 8h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mb-1.5 text-2xl font-extrabold tracking-tight text-white">
            IRONMARK <span className="font-light text-brand-electric-light">EXTERIORS</span>
          </div>
          <p className="text-sm text-white/45">Internal team login</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-white/25">
          Hamilton, Ontario — Roofing · Siding · Gutters · Windows
        </p>
      </div>
    </div>
  );
}
