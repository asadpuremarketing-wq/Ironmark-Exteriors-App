"use client";

import { useRouter, usePathname } from "next/navigation";
import { DATE_RANGE_PRESETS, DATE_RANGE_LABELS, type DateRangePreset } from "@/lib/reports";

export default function DateRangeSelector({
  preset,
  start,
  end,
}: {
  preset: DateRangePreset;
  start?: string;
  end?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function setPreset(next: DateRangePreset) {
    const params = new URLSearchParams();
    params.set("range", next);
    if (next === "custom") {
      if (start) params.set("start", start);
      if (end) params.set("end", end);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustom(field: "start" | "end", value: string) {
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("start", field === "start" ? value : (start ?? value));
    params.set("end", field === "end" ? value : (end ?? value));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {DATE_RANGE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              preset === p ? "bg-brand-electric text-white" : "bg-ink-900/5 text-ink-900/60 hover:bg-ink-900/10"
            }`}
          >
            {DATE_RANGE_LABELS[p]}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={start ?? ""}
            onChange={(e) => setCustom("start", e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none focus:border-brand-electric"
          />
          <span className="text-sm text-ink-900/40">to</span>
          <input
            type="date"
            value={end ?? ""}
            onChange={(e) => setCustom("end", e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none focus:border-brand-electric"
          />
        </div>
      )}
    </div>
  );
}
