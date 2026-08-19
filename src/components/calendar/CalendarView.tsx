"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday as isTodayFn,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { STATUS_LABELS, STATUS_STYLES, formatTime } from "@/lib/jobs";
import type { JobStatus } from "@prisma/client";

type CalendarJob = {
  id: string;
  jobNumber: string;
  service: string;
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
  estimatedDuration: string | null;
  status: JobStatus;
  city: string | null;
  customer: { id: string; firstName: string; lastName: string };
};

type ViewMode = "month" | "week" | "day";

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Parses a free-text duration like "2 hours" / "90 min" into minutes; falls back to 60. */
function parseDurationMinutes(duration: string | null): number {
  if (!duration) return 60;
  const num = parseFloat(duration);
  if (!Number.isFinite(num)) return 60;
  if (/hour|hr/i.test(duration)) return num * 60;
  if (/min/i.test(duration)) return num;
  return num * 60; // bare number assumed to be hours
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** True if two jobs on the same day have overlapping time windows. Jobs with no start time never overlap (can't tell). */
function jobsOverlap(a: CalendarJob, b: CalendarJob): boolean {
  const aStart = timeToMinutes(a.startTime);
  const bStart = timeToMinutes(b.startTime);
  if (aStart === null || bStart === null) return false;
  const aEnd = aStart + parseDurationMinutes(a.estimatedDuration);
  const bEnd = bStart + parseDurationMinutes(b.estimatedDuration);
  return aStart < bEnd && bStart < aEnd;
}

export default function CalendarView() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);

  const { rangeStart, rangeEnd, gridDays } = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { rangeStart: gridStart, rangeEnd: gridEnd, gridDays: eachDayOfInterval({ start: gridStart, end: gridEnd }) };
    }
    if (viewMode === "week") {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
      return { rangeStart: weekStart, rangeEnd: weekEnd, gridDays: eachDayOfInterval({ start: weekStart, end: weekEnd }) };
    }
    return { rangeStart: anchor, rangeEnd: anchor, gridDays: [anchor] };
  }, [viewMode, anchor]);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/jobs?range=${dateKey(rangeStart)},${dateKey(rangeEnd)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs.");
        return res.json();
      })
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setError("Could not load calendar jobs. Please try again."))
      .finally(() => setLoading(false));
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    // fetchJobs sets loading/error state as part of kicking off the fetch —
    // this is the standard "fetch on mount / when range changes" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, CalendarJob[]>();
    for (const job of jobs) {
      const key = job.scheduledDate.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(job);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [jobs]);

  async function rescheduleJob(job: CalendarJob, newDateKey: string) {
    setWarning(null);
    const dayJobs = (jobsByDay.get(newDateKey) ?? []).filter((j) => j.id !== job.id);
    const candidate = { ...job, scheduledDate: `${newDateKey}T00:00:00.000Z` };
    const overlapping = dayJobs.find((j) => jobsOverlap(candidate, j));
    if (overlapping) {
      setWarning(
        `Heads up: ${job.customer.firstName} ${job.customer.lastName}'s job now overlaps with ${overlapping.customer.firstName} ${overlapping.customer.lastName}'s job on ${format(new Date(newDateKey), "MMM d")}. Rescheduled anyway — double-check times.`
      );
    }

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, scheduledDate: `${newDateKey}T00:00:00.000Z` } : j))
    );

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: job.customer.id,
          service: job.service,
          scheduledDate: newDateKey,
          startTime: job.startTime ?? undefined,
          estimatedDuration: job.estimatedDuration ?? undefined,
          status: job.status,
        }),
      });
      if (!res.ok) {
        await fetchJobs();
        setError("Could not reschedule that job. Please try again.");
      } else {
        fetchJobs();
      }
    } catch {
      await fetchJobs();
      setError("Could not reschedule that job. Please try again.");
    }
  }

  function goPrev() {
    setAnchor((d) => (viewMode === "month" ? addMonths(d, -1) : viewMode === "week" ? addWeeks(d, -1) : addDays(d, -1)));
  }
  function goNext() {
    setAnchor((d) => (viewMode === "month" ? addMonths(d, 1) : viewMode === "week" ? addWeeks(d, 1) : addDays(d, 1)));
  }
  function goToday() {
    setAnchor(new Date());
  }

  const headerLabel =
    viewMode === "month"
      ? format(anchor, "MMMM yyyy")
      : viewMode === "week"
        ? `${format(startOfWeek(anchor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(anchor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
        : format(anchor, "EEEE, MMMM d, yyyy");

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Calendar</h1>
          <a
            href={`/jobs/new?date=${dateKey(viewMode === "day" ? anchor : new Date())}`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            + New Job
          </a>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-900/15 text-ink-900/60 hover:bg-ink-900/5"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm font-semibold text-ink-900/70 hover:bg-ink-900/5"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-900/15 text-ink-900/60 hover:bg-ink-900/5"
            >
              ›
            </button>
            <span className="ml-1 text-sm font-bold text-ink-900">{headerLabel}</span>
          </div>

          <div className="flex gap-1 rounded-lg bg-ink-900/5 p-1">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  viewMode === mode ? "bg-white text-ink-900 shadow-sm" : "text-ink-900/50 hover:text-ink-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {warning && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="mt-0.5">⚠</span>
          <span className="flex-1">{warning}</span>
          <button type="button" onClick={() => setWarning(null)} className="font-bold">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/40">
          Loading…
        </div>
      ) : (
        <>
          {/* Desktop: real grid for month/week, timeline list for day */}
          <div className="hidden md:block">
            {viewMode === "day" ? (
              <DayAgenda
                day={anchor}
                jobs={jobsByDay.get(dateKey(anchor)) ?? []}
                onJobClick={(id) => router.push(`/jobs/${id}`)}
              />
            ) : (
              <MonthWeekGrid
                gridDays={gridDays}
                anchor={anchor}
                viewMode={viewMode}
                jobsByDay={jobsByDay}
                onJobClick={(id) => router.push(`/jobs/${id}`)}
                draggingJobId={draggingJobId}
                setDraggingJobId={setDraggingJobId}
                onDropOnDay={(job, newKey) => rescheduleJob(job, newKey)}
              />
            )}
          </div>

          {/* Mobile: always an agenda list — a shrunk month/week grid is unusable on a phone */}
          <div className="md:hidden">
            <MobileAgenda
              viewMode={viewMode}
              gridDays={gridDays}
              jobsByDay={jobsByDay}
              onJobClick={(id) => router.push(`/jobs/${id}`)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function JobChip({ job, draggable, onDragStart }: { job: CalendarJob; draggable?: boolean; onDragStart?: () => void }) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", job.id);
        onDragStart?.();
      }}
      className={`truncate rounded-md px-1.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[job.status]} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      title={`${formatTime(job.startTime) ?? ""} ${job.customer.firstName} ${job.customer.lastName} — ${job.service}`}
    >
      {job.startTime ? `${formatTime(job.startTime)} ` : ""}
      {job.customer.firstName} {job.customer.lastName}
    </div>
  );
}

function MonthWeekGrid({
  gridDays,
  anchor,
  viewMode,
  jobsByDay,
  onJobClick,
  draggingJobId,
  setDraggingJobId,
  onDropOnDay,
}: {
  gridDays: Date[];
  anchor: Date;
  viewMode: ViewMode;
  jobsByDay: Map<string, CalendarJob[]>;
  onJobClick: (id: string) => void;
  draggingJobId: string | null;
  setDraggingJobId: (id: string | null) => void;
  onDropOnDay: (job: CalendarJob, newKey: string) => void;
}) {
  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-ink-900/10 bg-ink-950/[0.02] text-center text-xs font-bold uppercase tracking-wide text-ink-900/50">
        {weekDayLabels.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${viewMode === "week" ? "" : ""}`}>
        {gridDays.map((day) => {
          const key = dateKey(day);
          const dayJobs = jobsByDay.get(key) ?? [];
          const dimmed = viewMode === "month" && !isSameMonth(day, anchor);
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const jobId = e.dataTransfer.getData("text/plain");
                const job = dayJobs.concat(Array.from(jobsByDay.values()).flat()).find((j) => j.id === jobId);
                if (job) onDropOnDay(job, key);
                setDraggingJobId(null);
              }}
              className={`min-h-[110px] border-b border-r border-ink-900/5 p-1.5 ${dimmed ? "bg-ink-900/[0.02]" : "bg-white"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isTodayFn(day) ? "bg-brand-electric text-white" : dimmed ? "text-ink-900/30" : "text-ink-900/70"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <a
                  href={`/jobs/new?date=${key}`}
                  className="text-xs font-bold text-ink-900/30 hover:text-brand-electric"
                  title="New job"
                >
                  +
                </a>
              </div>
              <div className="flex flex-col gap-1">
                {dayJobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onJobClick(job.id)}
                    className={`cursor-pointer ${draggingJobId === job.id ? "opacity-40" : ""}`}
                  >
                    <JobChip job={job} draggable onDragStart={() => setDraggingJobId(job.id)} />
                  </div>
                ))}
                {dayJobs.length > 4 && (
                  <span className="text-[10px] font-semibold text-ink-900/40">+{dayJobs.length - 4} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayAgenda({ day, jobs, onJobClick }: { day: Date; jobs: CalendarJob[]; onJobClick: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
      <div className="border-b border-ink-900/10 bg-ink-950/[0.02] px-5 py-3 text-sm font-bold text-ink-900">
        {format(day, "EEEE, MMMM d")}
      </div>
      {jobs.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-900/40">Nothing scheduled.</div>
      ) : (
        <div className="flex flex-col divide-y divide-ink-900/5">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onJobClick(job.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-left text-sm transition hover:bg-brand-electric/[0.03]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink-900">{formatTime(job.startTime) ?? "—"}</span>
                <span className="text-ink-900">
                  {job.customer.firstName} {job.customer.lastName}
                </span>
                <span className="text-ink-900/50">{job.service}</span>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}>
                {STATUS_LABELS[job.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mobile agenda view — used for all three view modes below `md`. A shrunk
 * month/week grid is unreadable on a 375px phone, so instead we show a
 * scrollable list of days (with jobs inline) covering the same date window.
 */
function MobileAgenda({
  viewMode,
  gridDays,
  jobsByDay,
  onJobClick,
}: {
  viewMode: ViewMode;
  gridDays: Date[];
  jobsByDay: Map<string, CalendarJob[]>;
  onJobClick: (id: string) => void;
}) {
  // For month view, only show days that actually have jobs plus today, to
  // keep the list scannable instead of showing 35+ empty day rows.
  const daysToShow =
    viewMode === "month"
      ? gridDays.filter((d) => (jobsByDay.get(dateKey(d))?.length ?? 0) > 0 || isTodayFn(d))
      : gridDays;

  if (daysToShow.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/40">
        No jobs scheduled this {viewMode === "month" ? "month" : "week"}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {daysToShow.map((day) => {
        const key = dateKey(day);
        const dayJobs = jobsByDay.get(key) ?? [];
        return (
          <div key={key} className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-ink-900/10 bg-ink-950/[0.02] px-4 py-2.5">
              <span className={`text-sm font-bold ${isTodayFn(day) ? "text-brand-electric" : "text-ink-900"}`}>
                {format(day, "EEE, MMM d")}
                {isTodayFn(day) ? " · Today" : ""}
              </span>
              <a href={`/jobs/new?date=${key}`} className="text-xs font-bold text-brand-electric">
                + New
              </a>
            </div>
            {dayJobs.length === 0 ? (
              <div className="px-4 py-4 text-xs text-ink-900/30">Nothing scheduled.</div>
            ) : (
              <div className="flex flex-col divide-y divide-ink-900/5">
                {dayJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onJobClick(job.id)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm active:bg-brand-electric/[0.05]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink-900">
                        {job.startTime
                          ? `${formatTime(job.startTime)}${job.endTime ? `–${formatTime(job.endTime)}` : ""} — `
                          : ""}
                        {job.customer.firstName} {job.customer.lastName}
                      </div>
                      <div className="truncate text-xs text-ink-900/50">{job.service}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
