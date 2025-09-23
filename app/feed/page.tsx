// app/feed/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

  // track media query for desktop
  const isDesktopRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      isDesktopRef.current = window.matchMedia("(min-width: 1024px)").matches;
    }
  }, []);

  // Load jobs
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

  // Base filtered by search + recommended (for counts)
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

  // State counts
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

  // Apply state filter
  const filtered = useMemo(() => {
    return baseFiltered.filter((j) => stateFilter === "ALL" || j.state === stateFilter);
  }, [baseFiltered, stateFilter]);

  // Restore selection from ?id=
  useEffect(() => {
    const id = params.get("id");
    if (!id || jobs.length === 0) return;
    setSelected(jobs.find((j) => j.id === id) ?? null);
  }, [params, jobs]);

  // Auto-select first on desktop
  useEffect(() => {
    if (!isDesktopRef.current) return;
    if (selected) return;
    if (!loading && filtered.length > 0) {
      setSelected(filtered[0]);
      router.push(`/feed?id=${filtered[0].id}`, { scroll: false });
    }
  }, [filtered, loading, selected, router]);

  // Clear filters
  function clearFilters() {
    setQ("");
    setStateFilter("ALL");
    setRecOnly(false);
    setSelected(null);
    router.push("/feed", { scroll: false });
  }

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm ${
      active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
    }`;

  return (
    <section className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3">
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

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={recOnly}
                onChange={(e) => setRecOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Recommended only
            </label>

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

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setStateFilter("ALL")} className={pill(stateFilter === "ALL")}>
              All ({counts.ALL})
            </button>
            {STATES.map((s) => (
              <button key={s} onClick={() => setStateFilter(s)} className={pill(stateFilter === s)}>
                {s} ({counts[s]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: cards */}
        <div className="space-y-3 lg:col-span-5">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
          ) : (
            filtered.map((j) => {
              const isActive = selected?.id === j.id;
              const chip = j.recommend
                ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                : "bg-red-50 text-red-700 ring-1 ring-red-200";

              // Compute cost display from cost_* fields
              const costDisplay =
                j.cost_type === "exact" && j.cost_exact != null
                  ? `Cost: $${Math.round(j.cost_exact).toLocaleString()}`
                  : j.cost_type === "range" && j.cost_min != null && j.cost_max != null
                  ? `Cost: $${Math.round(j.cost_min).toLocaleString()}–$${Math.round(j.cost_max).toLocaleString()}`
                  : null;

              const CardInner = (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{timeAgo(j.created_at ?? undefined)}</span>
                    {j.recommend !== null && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${chip}`}>
                        {j.recommend ? "Recommended" : "Not recommended"}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-base leading-snug line-clamp-2">
                    {j.title || "Untitled"}
                  </h3>

                  {j.business_name && (
                    <p className="text-sm text-gray-700 font-medium">{j.business_name}</p>
                  )}

                  <p className="text-sm text-gray-500">
                    {j.suburb}, {j.state} {j.postcode}
                  </p>

                  {costDisplay && <p className="text-sm text-gray-700">{costDisplay}</p>}
                </div>
              );

              return (
                <div
                  key={j.id}
                  className={`rounded-2xl border bg-white p-4 transition ${
                    isActive ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
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
                    {CardInner}
                  </button>

                  {/* Mobile: open the public page */}
                  <Link href={`/post/${j.id}`} className="block w-full lg:hidden">
                    {CardInner}
                  </Link>
                </div>
              );
            })
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

/* --- helpers --- */
function timeAgo(iso?: string | null) {
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
