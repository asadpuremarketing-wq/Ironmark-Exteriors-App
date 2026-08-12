import Link from "next/link";
import { prisma } from "@/lib/prisma";
import JobsView from "@/components/jobs/JobsView";

export default async function JobsPage() {
  const jobsRaw = await prisma.job.findMany({
    include: { customer: true },
    orderBy: { scheduledDate: "desc" },
  });

  const jobs = jobsRaw.map((j) => ({
    ...j,
    quotedPrice: j.quotedPrice === null ? null : Number(j.quotedPrice),
    finalPrice: j.finalPrice === null ? null : Number(j.finalPrice),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Jobs</h1>
          <p className="mt-1 text-sm text-ink-900/60">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
          Add Job
        </Link>
      </div>

      <JobsView jobs={jobs} />
    </div>
  );
}
