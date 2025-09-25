// components/Feed.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function costDisplay(j: Job) {
  if (j.cost_type === "exact" && j.cost != null && String(j.cost).trim() !== "") {
    const n = Number(j.cost);
    return isFinite(n) ? `$${Math.round(n).toLocaleString()}` : `$${String(j.cost)}`;
  }
  if (j.cost_type === "range" && j.cost_min != null && j.cost_max != null) {
    const minN = Number(j.cost_min);
    const maxN = Number(j.cost_max);
    const left = isFinite(minN) ? Math.round(minN).toLocaleString() : String(j.cost_min);
    const right = isFinite(maxN) ? Math.round(maxN).toLocaleString() : String(j.cost_max);
    return `$${left}–$${right}`;
  }
  return "Cost not shared";
}

function FeedInner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,business_name,suburb,state,postcode,recommend,cost_type,cost,cost_min,cost_max,notes,created_at")
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) {
          console.error(error.message);
          setJobs([]);
        } else {
          setJobs((data as Job[]) ?? []);
        }
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const emptyText = useMemo(() => {
    if (loading) return "Loading…";
    return "No posts yet. Be the first to share!";
  }, [loading]);

  return (
    <section className="space-y-3">
      {jobs.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-600">{emptyText}</div>
      ) : (
        jobs.map((j) => (
          <Link
            key={j.id}
            href={`/post/${j.id}`}
            prefetch={false}
            className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 hover:shadow-md transition"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{timeAgo(j.created_at)}</span>
              {j.recommend != null && (
                j.recommend ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 border border-emerald-200">
                    Recommended
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-700 border border-red-200">
                    Not recommended
                  </span>
                )
              )}
            </div>

            <h3 className="truncate text-base font-semibold text-gray-900">{j.title || "Untitled job"}</h3>
            <p className="truncate text-sm text-gray-700">{j.business_name || "Unknown business"}</p>
            <p className="text-xs text-gray-500">
              {[j.suburb, j.state, j.postcode].filter(Boolean).join(", ")}
            </p>

            <div className="mt-2 text-sm text-gray-900 font-semibold">{costDisplay(j)}</div>

            {j.notes ? (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{j.notes}</p>
            ) : null}
          </Link>
        ))
      )}
    </section>
  );
}

export default function Feed() {
  return (
    <Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}
