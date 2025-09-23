"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type AusState = (typeof STATES)[number];
type StateFilter = "ALL" | AusState;

export default function FeedPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [recOnly, setRecOnly] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const isDesktopRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    isDesktopRef.current = window.matchMedia("(min-width: 1024px)").matches;

    (async () => {
      setLoading(true);
      const [{ data: auth }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      ]);
      setCurrentUserId(auth?.user?.id ?? null);
      if (error) {
        console.error(error);
        setJobs([]);
      } else {
        const list = (data ?? []) as Job[];
        setJobs(list);
        if (isDesktopRef.current && list.length) setSelected(list[0]);
      }
      setLoading(false);
    })();

    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!el.closest("[data-menu-root]")) setMenuOpenId(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const baseFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (recOnly && !j.recommend) return false;
      if (!needle) return true;
      const hay = [j.title ?? "", j.business_name ?? "", j.suburb ?? "", j.postcode ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [jobs, q, recOnly]);

  const counts = useMemo(() => {
    const map: Record<StateFilter, number> = {
      ALL: baseFiltered.length, VIC: 0, NSW: 0, QLD: 0, SA: 0, WA: 0, TAS: 0, ACT: 0, NT: 0,
    };
    for (const j of baseFiltered) {
      const st = (j.state as AusState) || null;
      if (st && map[st] !== undefined) map[st] += 1;
    }
    return map;
  }, [baseFiltered]);

  const filtered = useMemo(
    () => baseFiltered.filter((j) => stateFilter === "ALL" || j.state === stateFilter),
    [baseFiltered, stateFilter]
  );

  function clearFilters() {
    setQ("");
    setStateFilter("ALL");
    setRecOnly(false);
    setSelected(isDesktopRef.current && filtered.length ? filtered[0] : null);
  }

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm ${
      active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
    }`;

  function costDisplay(j: Job) {
    // exact / range
    if (j.cost_type === "exact" && j.cost_exact != null) {
      return `$${Math.round(Number(j.cost_exact)).toLocaleString()}`;
    }
    if (j.cost_type === "range" && j.cost_min != null && j.cost_max != null) {
      return `$${Math.round(Number(j.cost_min)).toLocaleString()}–$${Math.round(
        Number(j.cost_max)
      ).toLocaleString()}`;
    }
    // legacy numeric or numeric string
    const any = j as Record<string, any>;
    const legacy = any.cost;
    if (typeof legacy === "number") return `$${Math.round(legacy).toLocaleString()}`;
    if (typeof legacy === "string" && legacy.trim() && !Number.isNaN(Number(legacy))) {
      return `$${Math.round(Number(legacy)).toLocaleString()}`;
    }
    if (typeof any.cost_text === "string" && any.cost_text.trim()) return any.cost_text.trim();
    return null;
  }

  async function handleDelete(jobId: string) {
    if (!currentUserId) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId).eq("owner_id", currentUserId);
    if (error) {
      alert("Could not delete. Please try again.");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    if (selected?.id === jobId) setSelected(null);
    setMenuOpenId(null);
  }

  function reportJob() {
    alert("Thanks for the report — we’ll review this post.");
    setMenuOpenId(null);
  }

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
                <path d="M21 21l-4.3-4.3m1.1-5.1a6.8 6.8 0 11-13.6 0 6.8 6.8 0 0113.6 0z"
                  stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
              {q && (
                <button
                  type="button"
                  onClick={clearFilters}
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
              <button type="button" onClick={clearFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
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

      {/* Two-pane */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left list */}
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
              const cost = costDisplay(j);
              const isMine = currentUserId && j.owner_id === currentUserId;

              return (
                <div
                  key={j.id}
                  className={`relative rounded-2xl border bg-white p-4 transition ${
                    isActive ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Entire card is clickable (desktop) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(j)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(j)}
                    className="hidden lg:block"
                  >
                    {/* top row */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{timeAgo(j.created_at ?? undefined)}</span>
                      <div className="flex items-center gap-2" data-menu-root>
                        {j.recommend != null && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${chip}`}>
                            {j.recommend ? "Recommended" : "Not recommended"}
                          </span>
                        )}
                        {/* ⋯ menu trigger */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId((cur) => (cur === j.id ? null : j.id));
                            }}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                            aria-haspopup="menu"
                            aria-expanded={menuOpenId === j.id}
                            aria-label="More actions"
                            title="More actions"
                          >
                            ⋯
                          </button>
                          {menuOpenId === j.id && (
                            <div role="menu" className="absolute right-0 z-20 mt-1 w-40 rounded-xl border bg-white p-1 shadow-lg">
                              {isMine ? (
                                <>
                                  <Link
                                    href={`/edit/${j.id}`}
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenId(null);
                                    }}
                                    className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                                  >
                                    Edit
                                  </Link>
                                  <button
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(j.id);
                                    }}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <button
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reportJob();
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                                >
                                  Report
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* title */}
                    <h3 className="mt-1 font-semibold text-base leading-snug line-clamp-2">
                      {j.title || "Untitled"}
                    </h3>

                    {/* business */}
                    {j.business_name && (
                      <p className="text-sm text-gray-700 font-medium mt-1">{j.business_name}</p>
                    )}

                    {/* location */}
                    <p className="text-sm text-gray-500 mt-1">
                      {j.suburb}, {j.state} {j.postcode}
                    </p>

                    {/* cost */}
                    {cost && <p className="text-sm text-gray-700 mt-1">{cost}</p>}
                  </div>

                  {/* Mobile: open detail page instead of 2-pane */}
                  <Link href={`/post/${j.id}`} className="block lg:hidden">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{timeAgo(j.created_at ?? undefined)}</span>
                      {j.recommend != null && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                            j.recommend
                              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                              : "bg-red-50 text-red-700 ring-1 ring-red-200"
                          }`}
                        >
                          {j.recommend ? "Recommended" : "Not recommended"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-semibold text-base leading-snug line-clamp-2">
                      {j.title || "Untitled"}
                    </h3>
                    {j.business_name && (
                      <p className="text-sm text-gray-700 font-medium mt-1">{j.business_name}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {j.suburb}, {j.state} {j.postcode}
                    </p>
                    {cost && <p className="text-sm text-gray-700 mt-1">{cost}</p>}
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Right detail */}
        <div className="hidden lg:block lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            <JobDetailCard job={selected} />
          </div>
        </div>
      </div>
    </section>
  );
}

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
