"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Job = {
  id: string;
  title?: string | null;
  business_name?: string | null;
  suburb?: string | null;
  state?: string | null;          // e.g. "VIC"
  postcode?: string | null;       // e.g. "3076"
  recommend?: boolean | null;     // true / false
  cost_type?: "exact" | "range" | "na" | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

function formatRelative(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function currency(n?: number | null) {
  if (n == null) return "";
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function JobDetailCard({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false);

  const costDisplay = useMemo(() => {
    if (job.cost_type === "exact" && job.cost_min != null) {
      return currency(job.cost_min);
    }
    if (job.cost_type === "range" && job.cost_min != null && job.cost_max != null) {
      return `${currency(job.cost_min)} – ${currency(job.cost_max)}`;
    }
    return "Cost not shared";
  }, [job.cost_min, job.cost_max, job.cost_type]);

  const shareUrl = useMemo(() => {
    if (!job.id) return "";
    // Will work on both right-panel and public page
    if (typeof window !== "undefined") {
      return `${window.location.origin}/post/${job.id}`;
    }
    return `/post/${job.id}`;
  }, [job.id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs text-gray-500">{formatRelative(job.created_at)}</span>
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

      {/* Who */}
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

      {/* Location */}
      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</div>
        <div className="mt-1 text-base">
          {job.suburb ? (
            <Link
              href={`/feed?suburb=${encodeURIComponent(job.suburb)}${
                job.state ? `&state=${encodeURIComponent(job.state)}` : ""
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

      {/* Cost */}
      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</div>
        <div className="mt-1 text-2xl font-semibold">{costDisplay}</div>
      </section>

      {/* Details */}
      {job.notes && (
        <section className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</div>
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-gray-800">
            {job.notes}
          </p>
        </section>
      )}

      {/* Divider + prompt + buttons */}
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
