// components/JobDetailCard.tsx
"use client";

import type { Job } from "@/types";
import { useMemo, useState } from "react";
import Link from "next/link";

export default function JobDetailCard({ job }: { job: Job | null }) {
  if (!job) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-gray-500">
        Select a job to view details.
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/post/${job.id}` : "";

  const costDisplay = useMemo(() => {
    if (job.cost_type === "exact" && job.cost_exact != null) {
      return `$${Math.round(job.cost_exact).toLocaleString()}`;
    }
    if (job.cost_type === "range" && job.cost_min != null && job.cost_max != null) {
      return `$${Math.round(job.cost_min).toLocaleString()}–$${Math.round(job.cost_max).toLocaleString()}`;
    }
    const anyJob = job as Record<string, any>;
    if (typeof anyJob.cost === "number") return `$${Math.round(anyJob.cost).toLocaleString()}`;
    if (typeof anyJob.cost_text === "string" && anyJob.cost_text.trim()) return anyJob.cost_text.trim();
    return "Cost not shared";
  }, [job]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs text-gray-500">{timeAgo(job.created_at)}</span>
        {job.recommend != null && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${
              job.recommend
                ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                : "bg-red-50 text-red-700 ring-1 ring-red-200"
            }`}
          >
            {job.recommend ? "Recommended" : "Not recommended"}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
        {job.title || "Untitled job"}
      </h2>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Who did it</div>
        {job.business_name ? (
          <Link
            href={`/feed?q=${encodeURIComponent(job.business_name)}`}
            className="mt-1 inline-block text-base underline"
          >
            {job.business_name}
          </Link>
        ) : (
          <div className="mt-1 text-base text-gray-600">Not specified</div>
        )}
      </section>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</div>
        <div className="mt-1 text-base">
          {job.suburb ? (
            <Link
              href={`/feed?q=${encodeURIComponent(job.suburb)}${
                job.state ? ` ${encodeURIComponent(job.state)}` : ""
              }`}
              className="underline"
            >
              {job.suburb}
            </Link>
          ) : (
            "—"
          )}
          {job.state ? `, ${job.state}` : ""} {job.postcode ? job.postcode : ""}
        </div>
      </section>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</div>
        <div className="mt-1 text-2xl font-semibold">{costDisplay}</div>
      </section>

      {job.notes && (
        <section className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</div>
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-gray-800">{job.notes}</p>
        </section>
      )}

      <div className="mt-8 border-t pt-5">
        <p className="text-sm text-gray-600">
          {job.suburb
            ? `Had something similar done in ${job.suburb}? Share it to help neighbours know what to expect.`
            : "Had something similar done? Share it to help neighbours know what to expect."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/submit"
            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Share your project
          </Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </article>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
