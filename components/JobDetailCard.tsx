// /components/JobDetailCard.tsx
"use client";

import type { Job } from "@/types";
import { useState } from "react";

type Props = { job: Job | null };

export default function JobDetailCard({ job }: Props) {
  if (!job) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-gray-500">
        Select a job to view details.
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/post/${job.id}`
      : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cost =
    job.cost_type === "exact" && job.cost_exact != null
      ? `$${job.cost_exact.toLocaleString()}`
      : job.cost_type === "range" && job.cost_min != null && job.cost_max != null
      ? `$${job.cost_min.toLocaleString()}–$${job.cost_max.toLocaleString()}`
      : "Cost not shared";

  return (
    <article className="rounded-2xl border bg-white p-6">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500">
          {job.created_at ? timeAgo(job.created_at) : ""}
        </span>
        {job.recommend != null && (
          <span
            className={`rounded-full border px-2 py-1 text-xs ${
              job.recommend
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {job.recommend ? "Recommended" : "Not recommended"}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-semibold leading-tight">
        {job.title || "Untitled"}
      </h2>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-xs font-medium text-gray-500">WHO DID IT</dt>
          <dd>
            {job.business_name ? (
              <a
                className="underline"
                href={`/feed?q=${encodeURIComponent(job.business_name)}`}
              >
                {job.business_name}
              </a>
            ) : (
              <span className="text-gray-500">Not provided</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500">LOCATION</dt>
          <dd>
            <a
              className="underline"
              href={`/feed?q=${encodeURIComponent(
                `${job.suburb}, ${job.state} ${job.postcode}`
              )}`}
            >
              {job.suburb}
            </a>
            {`, ${job.state} ${job.postcode}`}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500">COST</dt>
          <dd>{cost}</dd>
        </div>

        {job.notes ? (
          <div>
            <dt className="text-xs font-medium text-gray-500">DETAILS</dt>
            <dd className="whitespace-pre-wrap">{job.notes}</dd>
          </div>
        ) : null}
      </dl>

      <hr className="my-6" />

      <p className="text-sm text-gray-600">
        Had something similar done in {job.suburb}? Share it to help neighbours
        know what to expect.
      </p>

      <div className="mt-3 flex gap-3">
        <a
          href="/submit"
          className="rounded-xl bg-gray-900 px-4 py-2 text-white"
        >
          Share your project
        </a>
        <button
          onClick={handleCopy}
          className="rounded-xl border px-4 py-2 hover:bg-gray-50"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </article>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
