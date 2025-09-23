// app/feed/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

const STATES = ["ALL", "VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type StateFilter = (typeof STATES)[number];

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}

function FeedInner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useSearchParams();
  const router = useRouter();

  // UI filters
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");

  // Load all jobs
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) console.error(error);
        setJobs((data ?? []) as Job[]);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Restore selection from ?id=
  useEffect(() => {
    const id = params.get("id");
    if (!id || jobs.length === 0) return;
    setSelected(jobs.find((j) => j.id === id) ?? null);
  }, [params, jobs]);

  // Apply filters safely (null-safe)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      const okState = stateFilter === "ALL" || j.state === stateFilter;
      if (!needle) return okState;
      const hay = [
        j.title ?? "",
        j.business_name ?? "",
        j.suburb ?? "",
        j.postcode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return okState && hay.includes(needle);
    });
  }, [jobs, q, stateFilter]);

  // Clear all filters & selection
  function clearFilters() {
    setQ("");
    setStateFilter("ALL");
    setSelected(null);
    router.push("/feed", { scroll: false });
  }

  return (
    <section className="space-y-4">
      {/* Filters card */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, business, suburb or postcode"
              className="w-full rounded-xl border pl-9 pr-9 py-2"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M21 21l-4.3-4.3m1.1-5.1a6.8 6.8 0 11-13.6 0 6.8 6.8 0 0113.6 0z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1.5 h-7 w-7 grid place-items-center rounded-lg hover:bg-gray-100"
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as StateFilter)}
            className="w-full sm:w-56 rounded-xl border px-3 py-2 text-sm"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All states" : s}
              </option>
            ))}
          </select>

          {(q || stateFilter !== "ALL") && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: list */}
        <div className="space-y-3 lg:col-span-5">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
          ) : (
            filtered.map((j) => (
              <button
                key={j.id}
                onClick={() => {
                  setSelected(j);
                  router.push(`/feed?id=${j.id}`, { scroll: false });
                }}
                className={`w-full rounded-2xl border bg-white p-4 text-left transition ${
                  selected?.id === j.id
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium line-clamp-2">{j.title || "Untitled"}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {j.business_name ? `${j.business_name} • ` : ""}
                  {j.suburb}, {j.state} {j.postcode}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: detail */}
        <div className="hidden lg:block lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            <JobDetailCard job={selected} />
          </div>
        </div>
      </div>
    </section>
  );
}
