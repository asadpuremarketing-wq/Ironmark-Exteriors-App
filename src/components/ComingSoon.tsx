export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/15 bg-white py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-electric/10 text-brand-electric">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-ink-900">Coming Soon</h2>
        <p className="mt-1 max-w-sm text-sm text-ink-900/50">
          This module hasn&apos;t been built yet — it&apos;s part of the roadmap.
        </p>
      </div>
    </div>
  );
}
