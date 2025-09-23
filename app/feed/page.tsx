// app/feed/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type AusState = (typeof STATES)[number];
type StateFilter = "ALL" | AusState;

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
  const [recOnly, setRecOnly] = useState(false);

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

  // Base filtered by search + recommended (used for state counters)
  const baseFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (recOnly && !j.recommend) return false;
      if (!needle) return true;
      const hay = [
        j.title ?? "",
        j.business_name ?? "",
        j.suburb ?? "",
        j.postcode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [jobs, q, recOnly]);

  // Counts per state from the baseFiltered set
  const counts = useMemo(() => {
    const map: Record<StateFilter, number> = {
      ALL: baseFiltered.length,
      VIC: 0,
      NSW: 0,
      QLD: 0,
      SA: 0,
      WA: 0,
      TAS: 0,
      ACT: 0,
      NT: 0,
    };
    for (const j of baseFiltered) {
      const st = (j.state as AusState) || null;
      if (st && map[st] !== undefined) map[st] += 1;
    }
    return map;
  }, [baseFiltered]);

  // Final filtered list includes state filter
  const filtered = useMemo(() => {
    return baseFiltered.filter((j) => stateFilter === "ALL" || j.state === stateFilter);
  }, [baseFiltered, stateFilter]);

  // Clear all filters & selection
  function clearFilters() {
    setQ("");
    setStateFilter("ALL");
    setRecOnly(false);
    setSelected(null);
    router.push("/feed", { scroll: false });
  }

  // Styles
  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm ${
      active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
    }`;

  return (
    <section className="space-y-4">
      {/* Filters card */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: search + clear */}
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

            <div className="flex items-center gap-2">
              <input
                id="recOnly"
                type="checkbox"
                checked={recOnly}
                onChange={(e) => setRecOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="recOnly" className="text-sm text-gray-700">
                Recommended only
              </label>
            </div>

            {(q || stateFilter !== "ALL" || recOnly) && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>

          {/* Row 2: state pills with counts (horizontal scroll on mobile) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStateFilter("ALL")}
              className={pill(stateFilter === "ALL")}
            >
              All ({counts.ALL})
            </button>
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={pill(stateFilter === s)}
              >
                {s} ({counts[s]})
              </button>
            ))}
          </div>
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
              <div
                key={j.id}
                className={`relative rounded-2xl border bg-white p-4 transition ${
                  selected?.id === j.id
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Desktop: select into right panel */}
                <button
                  onClick={() => {
                    setSelected(j);
                    router.push(`/feed?id=${j.id}`, { scroll: false });
                  }}
                  className="hidden w-full text-left lg:block"
                >
                  <div className="font-medium line-clamp-2">{j.title || "Untitled"}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {j.business_name ? `${j.business_name} • ` : ""}
                    {j.suburb}, {j.state} {j.postcode}
                  </div>
                </button>

                {/* Mobile: open the public page */}
                <Link
                  href={`/post/${j.id}`}
                  className="block w-full text-left lg:hidden"
                >
                  <div className="font-medium line-clamp-2">{j.title || "Untitled"}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {j.business_name ? `${j.business_name} • ` : ""}
                    {j.suburb}, {j.state} {j.postcode}
                  </div>
                </Link>
              </div>
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
