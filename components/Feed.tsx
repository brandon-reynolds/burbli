// components/Feed.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";
import type { Job } from "@/types";

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type StateCode = (typeof STATES)[number] | "ALL";

function useIsDesktop(breakpointPx = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= breakpointPx
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const listener = () => setIsDesktop(mq.matches);
    listener();
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, [breakpointPx]);
  return isDesktop;
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.floor((now - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
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
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const isDesktop = useIsDesktop(1024);

  const [query, setQuery] = useState<string>(search.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState<StateCode>((search.get("state") as StateCode) || "ALL");
  const [recOnly, setRecOnly] = useState<boolean>((search.get("rec") ?? "") === "1");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<Job | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setJobs(data as Job[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (recOnly) params.set("rec", "1");
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, stateFilter, recOnly]);

  const counts = useMemo(() => {
    const base: Record<StateCode, number> = {
      ALL: jobs.length,
      VIC: 0, NSW: 0, QLD: 0, SA: 0, WA: 0, TAS: 0, ACT: 0, NT: 0,
    };
    for (const j of jobs) {
      const st = (j.state ?? "") as StateCode;
      if (st && st in base) base[st] += 1;
    }
    return base;
  }, [jobs]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const okRec = !recOnly || !!j.recommend;
      const okS = stateFilter === "ALL" || j.state === stateFilter;
      const okQ =
        !s ||
        [j.title, j.suburb, j.business_name, j.postcode].some((v) =>
          String(v ?? "").toLowerCase().includes(s)
        );
      return okQ && okS && okRec;
    });
  }, [jobs, query, stateFilter, recOnly]);

  useEffect(() => {
    setSelected((cur) => {
      if (cur && filtered.some((j) => j.id === cur.id)) return cur;
      return filtered.length ? filtered[0] : null;
    });
  }, [filtered]);

  // Open behaviour: desktop selects in-place; mobile navigates
  function openJob(j: Job, e?: React.SyntheticEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDesktop) {
      setSelected(j);
      return;
    }
    router.push(`/post/${j.id}`);
  }

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Filters */}
      <div className="lg:col-span-12 rounded-2xl border bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Search by title, business, suburb or postcode"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
            <label className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={recOnly}
                onChange={(e) => setRecOnly(e.target.checked)}
              />
              Recommended only
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", ...STATES] as StateCode[]).map((code) => {
              const active = stateFilter === code;
              const count = counts[code] ?? 0;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setStateFilter(code)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm",
                    active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50",
                  ].join(" ")}
                >
                  {code} ({count})
                </button>
              );
            })}
            <div className="sm:hidden ml-auto">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={recOnly}
                  onChange={(e) => setRecOnly(e.target.checked)}
                />
                Recommended only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Left list */}
      <div className="lg:col-span-5 space-y-3 relative z-10">
        {loading && (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            No results. Try clearing filters.
          </div>
        )}
        {!loading &&
          filtered.map((j) => {
            const isActive = selected?.id === j.id && isDesktop;
            const href = `/post/${j.id}`;
            return (
              <a
                key={j.id}
                href={href}
                onClick={(e) => openJob(j, e)}
                onTouchEnd={(e) => openJob(j, e)}
                className={[
                  // super high z-index + explicit pointer events to beat stray overlays
                  "relative z-[60] block rounded-2xl border bg-white p-4 transition focus:outline-none",
                  isActive ? "ring-2 ring-indigo-300 border-indigo-400" : "hover:shadow-sm",
                ].join(" ")}
                style={{ touchAction: "manipulation", pointerEvents: "auto" }}
                aria-label={`Open ${j.title ?? "job"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{timeAgo(j.created_at)}</span>
                  {j.recommend ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700 border border-green-200">
                      Recommended
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-700 border border-red-200">
                      Not recommended
                    </span>
                  )}
                </div>

                <h3 className="truncate text-base font-semibold">{j.title ?? "Untitled"}</h3>

                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {j.business_name && <p>{j.business_name}</p>}
                  <p>
                    {j.suburb}, {j.state} {j.postcode}
                  </p>
                  <p>{costDisplay(j)}</p>
                </div>
              </a>
            );
          })}
      </div>

      {/* Right detail */}
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          {selected ? (
            <JobDetailCard job={selected} />
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">
              Select a job on the left to view details.
            </div>
          )}
        </div>
      </div>
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
