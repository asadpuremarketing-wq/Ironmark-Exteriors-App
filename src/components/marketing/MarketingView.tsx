"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_LABELS } from "@/lib/marketing";
import type { MarketingPlatform, MarketingSpend } from "@prisma/client";
import type { LeadSourcePerformance, AdSpendSummary, OverallAdCostPerJob } from "@/lib/marketing";

type SpendRow = Omit<MarketingSpend, "amount"> & { amount: number };

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";
const selectClasses =
  "rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function MarketingView({
  spend,
  performance,
  adSummary,
  overall,
}: {
  spend: SpendRow[];
  performance: LeadSourcePerformance[];
  adSummary: AdSpendSummary;
  overall: OverallAdCostPerJob;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    date: todayKey(),
    platform: "META_ADS" as MarketingPlatform,
    campaignName: "",
    amount: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredSpend = useMemo(() => {
    return spend.filter((s) => {
      if (platformFilter && s.platform !== platformFilter) return false;
      if (startDate && new Date(s.date).toISOString().slice(0, 10) < startDate) return false;
      if (endDate && new Date(s.date).toISOString().slice(0, 10) > endDate) return false;
      return true;
    });
  }, [spend, platformFilter, startDate, endDate]);

  const totalSpend = useMemo(() => filteredSpend.reduce((sum, s) => sum + s.amount, 0), [filteredSpend]);

  async function handleAddSpend(e: FormEvent) {
    e.preventDefault();
    if (!formValues.amount) {
      setError("Please enter an amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setFormValues({ date: todayKey(), platform: "META_ADS", campaignName: "", amount: "", notes: "" });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this marketing spend entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete.");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Overall Cost Per Job — total ad spend / total jobs booked, no source tagging required */}
      <section>
        <h2 className="mb-1 text-base font-bold text-ink-900">Cost Per Job Booked</h2>
        <p className="mb-4 text-xs text-ink-900/50">
          Every dollar logged as ad spend (Marketing Spend entries + ad-category Expenses) ÷ every job booked that
          isn&apos;t Cancelled. This is your real blended cost — no need to tag each job&apos;s source for this number
          to be accurate.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-brand-electric/30 bg-brand-electric/5 p-5">
            <div className="text-3xl font-extrabold tabular-nums text-brand-electric">
              {overall.costPerJob !== null ? formatMoney(overall.costPerJob) : "—"}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">Cost Per Job</div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm">
            <div className="text-3xl font-extrabold tabular-nums text-ink-900">
              {formatMoney(overall.totalAdSpend)}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">
              Total Ad Spend
            </div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm">
            <div className="text-3xl font-extrabold tabular-nums text-ink-900">{overall.totalJobsBooked}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">
              Jobs Booked (excl. Cancelled)
            </div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm">
            <div className="text-3xl font-extrabold tabular-nums text-ink-900">
              {formatMoney(overall.totalRevenue)}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">
              Revenue Generated
            </div>
          </div>
        </div>
      </section>

      {/* Per-source breakdown — needs each job's Source tagged to be accurate */}
      <section>
        <h2 className="mb-1 text-base font-bold text-ink-900">Ad Cost Per Job, by Source</h2>
        <p className="mb-4 text-xs text-ink-900/50">
          Combined across all paid channels (Meta Ads, Google Ads, Google LSA, Facebook Marketplace, flyers, door
          hangers, yard signs) — excludes referrals, organic, and jobs with no source on file, since those have no ad
          spend behind them.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-brand-electric/30 bg-brand-electric/5 p-4">
            <div className="text-2xl font-extrabold tabular-nums text-brand-electric">
              {adSummary.costPerJob !== null ? formatMoney(adSummary.costPerJob) : "—"}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">Cost Per Job</div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm">
            <div className="text-2xl font-extrabold tabular-nums text-ink-900">{formatMoney(adSummary.spend)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">Ad Spend</div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm">
            <div className="text-2xl font-extrabold tabular-nums text-ink-900">{adSummary.jobCount}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">Jobs from Ads</div>
          </div>
          <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm">
            <div className="text-2xl font-extrabold tabular-nums text-ink-900">{formatMoney(adSummary.revenue)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-900/50">Revenue from Ads</div>
          </div>
        </div>
      </section>

      {/* Source Performance */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink-900">Source Performance</h2>
          <p className="mt-0.5 text-xs text-ink-900/50">
            Cost Per Job = your logged ad spend ÷ jobs actually booked from that source — every job counts here,
            whether or not it started as a tracked lead.
          </p>
        </div>
        {performance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-12 text-center text-sm text-ink-900/50">
            No leads or jobs yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">Jobs Booked</th>
                  <th className="px-4 py-3">Spend</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Cost Per Job</th>
                  <th className="px-4 py-3">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.leadSource} className="border-b border-ink-900/5 last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-ink-900">{p.leadSource}</td>
                    <td className="px-4 py-3 text-ink-900/70">{p.leadCount}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{p.jobCount}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(p.spend)}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(p.revenue)}</td>
                    <td className="px-4 py-3 font-bold text-brand-electric">
                      {p.cac !== null ? formatMoney(p.cac) : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-900/70">{p.roas !== null ? `${p.roas.toFixed(2)}x` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Spend Log */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-900">Marketing Spend Log</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            {showForm ? "Cancel" : "Add Spend"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddSpend}
            className="mb-5 flex flex-col gap-4 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-ink-900">Date</label>
                <input
                  type="date"
                  required
                  value={formValues.date}
                  onChange={(e) => setFormValues((v) => ({ ...v, date: e.target.value }))}
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-ink-900">Platform</label>
                <select
                  value={formValues.platform}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, platform: e.target.value as MarketingPlatform }))
                  }
                  className={inputClasses}
                >
                  {(Object.entries(PLATFORM_LABELS) as [MarketingPlatform, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-ink-900">
                  Campaign Name <span className="font-normal text-ink-900/40">(optional)</span>
                </label>
                <input
                  value={formValues.campaignName}
                  onChange={(e) => setFormValues((v) => ({ ...v, campaignName: e.target.value }))}
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-ink-900">Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formValues.amount}
                    onChange={(e) => setFormValues((v) => ({ ...v, amount: e.target.value }))}
                    className={`${inputClasses} w-full pl-7`}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">
                Notes <span className="font-normal text-ink-900/40">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={formValues.notes}
                onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))}
                className={inputClasses}
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-fit rounded-lg bg-brand-electric px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Spend"}
            </button>
          </form>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className={selectClasses}>
            <option value="">All Platforms</option>
            {(Object.entries(PLATFORM_LABELS) as [MarketingPlatform, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={selectClasses} aria-label="Start date" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={selectClasses} aria-label="End date" />
          {(platformFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setPlatformFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-electric hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <span className="mb-3 block text-xs font-medium text-ink-900/40">
          {filteredSpend.length} of {spend.length} entries · Total {formatMoney(totalSpend)}
        </span>

        {filteredSpend.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-12 text-center text-sm text-ink-900/50">
            {spend.length === 0 ? "No marketing spend logged yet." : "No entries match your filters."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpend.map((s) => (
                  <tr key={s.id} className="border-b border-ink-900/5 last:border-b-0">
                    <td className="px-4 py-3 text-ink-900/60">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{PLATFORM_LABELS[s.platform]}</td>
                    <td className="px-4 py-3 text-ink-900/70">{s.campaignName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(s.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s.id)}
                        className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
