// components/JobDetailCard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  business_name: string | null;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  recommend: boolean;
  cost_type: "exact" | "range" | "hidden";
  cost_amount?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  created_at: string;
};

const fmtAUD = (cents?: number | null) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
        .format(Math.round(cents / 100))
    : null;

function costLabel(j: Job) {
  if (j.cost_type === "exact" && j.cost_amount) return fmtAUD(j.cost_amount);
  if (j.cost_type === "range" && j.cost_min && j.cost_max)
    return `${fmtAUD(j.cost_min)} – ${fmtAUD(j.cost_max)}`;
  return "Cost not shared";
}

function since(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function JobDetailCard({ job }: { job: Job | null }) {
  const [copied, setCopied] = useState(false);

  if (!job) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
        Select a job from the list to see details.
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/post/${job.id}` : `/post/${job.id}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  }

  const chip = job.recommend
    ? "bg-green-50 text-green-800 border-green-200"
    : "bg-red-50 text-red-800 border-red-200";

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      {/* summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-gray-500">{since(job.created_at)}</div>
        <span className={`rounded-full px-2 py-0.5 text-xs border ${chip}`}>
          {job.recommend ? "Recommended" : "Not recommended"}
        </span>
      </div>

      {/* FIELD: Title */}
      <section className="mt-2">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Title</div>
        <h2 className="mt-1 text-2xl font-semibold leading-snug">
          {job.title || "Untitled job"}
        </h2>
      </section>

      {/* FIELD: Who did it (clickable to search) */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Who did it</div>
        <div className="mt-1 text-[15px] text-gray-900">
          {job.business_name ? (
            <Link
              href={`/feed?q=${encodeURIComponent(job.business_name)}`}
              className="underline hover:no-underline"
            >
              {job.business_name}
            </Link>
          ) : (
            "Not specified"
          )}
        </div>
      </section>

      {/* FIELD: Location (clearer suburb) */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Location</div>
        <div className="mt-1 text-[15px] text-gray-900">
          <Link
            href={`/feed?q=${encodeURIComponent(job.suburb)}`}
            className="underline hover:no-underline"
          >
            {job.suburb}
          </Link>
          {", "}{job.state} {job.postcode}
        </div>
      </section>

      {/* FIELD: Cost */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Cost</div>
        <div className="mt-1 text-xl font-semibold">{costLabel(job)}</div>
      </section>

      {/* FIELD: Details */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Details</div>
        <div className="mt-2 text-[15px] leading-6 text-gray-900 whitespace-pre-wrap">
          {job.notes?.trim() || "—"}
        </div>
      </section>

      {/* CTAs */}
      <section className="mt-8 flex flex-wrap gap-2">
        <a href="/submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
          Post a job
        </a>
        <button onClick={copyLink} className="px-4 py-2 rounded-xl border hover:bg-gray-50">
          {copied ? "Copied!" : "Copy link"}
        </button>
      </section>
    </article>
  );
}
