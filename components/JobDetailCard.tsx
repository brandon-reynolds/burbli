"use client";
import type { Job } from "@/types";
import { useState } from "react";

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

  const cost =
    job.cost_type === "exact" && job.cost_exact != null
      ? `$${job.cost_exact.toLocaleString()}`
      : job.cost_type === "range" && job.cost_min != null && job.cost_max != null
      ? `$${job.cost_min.toLocaleString()}–$${job.cost_max.toLocaleString()}`
      : "Cost not shared";

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="rounded-2xl border bg-white p-6">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500">{job.created_at ?? ""}</span>
        {job.recommend != null && (
          <span className={`rounded-full border px-2 py-1 text-xs ${
            job.recommend ? "border-green-200 bg-green-50 text-green-700"
                           : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {job.recommend ? "Recommended" : "Not recommended"}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-semibold">{job.title || "Untitled"}</h2>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-xs font-medium text-gray-500">WHO DID IT</dt>
          <dd>{job.business_name || <span className="text-gray-500">Not provided</span>}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">LOCATION</dt>
          <dd>{job.suburb}, {job.state} {job.postcode}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">COST</dt>
          <dd>{cost}</dd>
        </div>
        {job.notes && (
          <div>
            <dt className="text-xs font-medium text-gray-500">DETAILS</dt>
            <dd className="whitespace-pre-wrap">{job.notes}</dd>
          </div>
        )}
      </dl>

      <hr className="my-6" />
      <p className="text-sm text-gray-600">
        Had something similar done in {job.suburb}? Share it to help neighbours.
      </p>
      <div className="mt-3 flex gap-3">
        <a href="/submit" className="rounded-xl bg-gray-900 px-4 py-2 text-white">Share your project</a>
        <button onClick={copyLink} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </article>
  );
}
