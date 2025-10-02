// app/feed/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";
import SuburbAutocomplete from "@/components/SuburbAutocomplete";
import type { Job as JobT } from "@/types";

type Job = JobT;

/* ---------------- Icons (inline SVG, no deps) ---------------- */

function IconBusiness(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M5 20V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12M9 12h6M9 16h6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconLocation(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="3" strokeWidth="1.8" />
    </svg>
  );
}
function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 9h16M6 21h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
function IconDollar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 7a4 4 0 0 0-4-3H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7a4 4 0 0 1-4-3" />
    </svg>
  );
}

/* ---------------- Helpers ---------------- */

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const mins = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function costDisplay(j: Job) {
  if (j.cost != null && j.cost_type === "exact" && String(j.cost).trim() !== "") {
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

function monthYear(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-AU", { month: "long", year: "numeric" });
}

// Normalize each job to a numeric [lo, hi] for cost, if possible
function costRange(j: Job): [number, number] | null {
  if (j.cost_type === "exact" && j.cost != null && String(j.cost).trim() !== "") {
    const n = Number(j.cost);
    return isFinite(n) ? [n, n] : null;
  }
  if (j.cost_type === "range" && j.cost_min != null && j.cost_max != null) {
    const a = Number(j.cost_min);
    const b = Number(j.cost_max);
    if (isFinite(a) && isFinite(b)) return [Math.min(a, b), Math.max(a, b)];
  }
  return null;
}

function parseMoney(s: string): number | null {
  const cleaned = s.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

/* ---------------- Page ---------------- */

function FeedInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL-backed filters
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [suburbQ, setSuburbQ] = useState<string>(sp.get("suburb") ?? "");
  const [stateQ, setStateQ] = useState<string>(sp.get("state") ?? "");
  const [onlyRecommended, setOnlyRecommended] = useState(sp.get("rec") === "1");

  // Cost filters (A$)
  const [costMin, setCostMin] = useState<string>(sp.get("cmin") ?? "");
  const [costMax, setCostMax] = useState<string>(sp.get("cmax") ?? "");

  // data
  const [all, setAll] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Job | null>(null);

  // load all jobs (newest first)
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        setAll([]);
      } else {
        setAll((data ?? []) as Job[]);
      }
      setLoading(false);
    })();
  }, []);

  // keep URL in sync (for share/back/forward)
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (suburbQ.trim()) params.set("suburb", suburbQ.trim());
    if (stateQ.trim()) params.set("state", stateQ.trim());
    if (onlyRecommended) params.set("rec", "1");
    if (costMin.trim()) params.set("cmin", costMin.trim());
    if (costMax.trim()) params.set("cmax", costMax.trim());
    router.replace(`/feed${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [q, suburbQ, stateQ, onlyRecommended, costMin, costMax, router]);

  // apply filters
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sub = suburbQ.trim().toLowerCase();
    const st = stateQ.trim().toUpperCase();
    const minV = parseMoney(costMin);
    const maxV = parseMoney(costMax);

    return all.filter((j) => {
      // free text
      const okFreeText =
        !s ||
        [j.title, j.suburb, j.business_name, j.notes]
          .map((v) => (v ?? "").toString().toLowerCase())
          .some((v) => v.includes(s));

      // suburb (exact suburb match; if state present, enforce)
      const okSuburb =
        !sub
          ? true
          : (String(j.suburb ?? "").toLowerCase() === sub &&
             (!st || String(j.state ?? "").toUpperCase() === st));

      // recommended
      const okRec = !onlyRecommended || !!j.recommend;

      // cost overlap filter
      const cr = costRange(j);
      const hasCostFilter = minV != null || maxV != null;
      let okCost = true;
      if (hasCostFilter) {
        if (!cr) {
          okCost = false;
        } else {
          const [lo, hi] = cr;
          const minOk = minV == null || hi >= minV;
          const maxOk = maxV == null || lo <= maxV;
          okCost = minOk && maxOk;
        }
      }

      return okFreeText && okSuburb && okRec && okCost;
    });
  }, [all, q, suburbQ, stateQ, onlyRecommended, costMin, costMax]);

  // auto-select first in the list on desktop
  useEffect(() => {
    if (!loading && filtered.length && !selected) setSelected(filtered[0]);
    if (!loading && !filtered.length) setSelected(null);
  }, [loading, filtered, selected]);

  const hasAnyFilter =
    Boolean(q || suburbQ || stateQ || onlyRecommended || costMin || costMax);

  return (
    <div className="min-h-[60vh]">
      {/* Top band (aligned with masthead container sizing) */}
      <div className="w-full border-b border-gray-100 bg-gray-50/60">
        <section className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-8">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Browse projects</h1>

          {/* Inputs: titles + controls (aligned grid) */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                Search text
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Search by title, business or details"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                Search suburb
              </div>
              <SuburbAutocomplete
                label={suburbQ && stateQ ? `${suburbQ}, ${stateQ}` : suburbQ}
                placeholder="Start typing a suburb…"
                onPick={(p) => {
                  setSuburbQ(p.suburb ?? "");
                  setStateQ(p.state ?? "");
                }}
                onBlurAutoFillEmpty
              />
            </div>

            {/* Cost filter row (spans both on desktop) */}
            <div className="md:col-span-2">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 w-full sm:w-auto">
                  Cost (A$)
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      value={costMin}
                      onChange={(e) => setCostMin(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Min"
                      className="w-32 rounded-xl border bg-white pl-7 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <span className="text-gray-500">–</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      inputMode="numeric"
                      value={costMax}
                      onChange={(e) => setCostMax(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Max"
                      className="w-32 rounded-xl border bg-white pl-7 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  {(costMin || costMax) && (
                    <button
                      onClick={() => {
                        setCostMin("");
                        setCostMax("");
                      }}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Clear cost
                    </button>
                  )}
                </div>

                <div className="ml-auto">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={onlyRecommended}
                      onChange={(e) => setOnlyRecommended(e.target.checked)}
                    />
                    Recommended only
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Result count under controls */}
          <div className="mt-3 text-sm text-gray-500">
            {loading
              ? "Loading…"
              : `${filtered.length.toLocaleString("en-AU")} result${filtered.length === 1 ? "" : "s"}`}
          </div>

          {/* Clear filters helper */}
          {hasAnyFilter && (
            <div className="mt-1">
              <button
                onClick={() => {
                  setQ("");
                  setSuburbQ("");
                  setStateQ("");
                  setOnlyRecommended(false);
                  setCostMin("");
                  setCostMax("");
                }}
                className="text-sm underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Results grid (aligned with masthead container) */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 pb-8 md:pb-12 grid lg:grid-cols-12 gap-6">
        {/* Left list (cards are links on mobile; selectable on desktop) */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
          ) : (
            filtered.map((j) => {
              const active = selected?.id === j.id;
              const done = monthYear(j.done_at);
              const location = [j.suburb, j.state].filter(Boolean).join(", ");

              return (
                <div key={j.id}>
                  {/* Mobile: make the whole card a link */}
                  <Link
                    href={`/post/${j.id}`}
                    className="block lg:hidden rounded-2xl border bg-white p-4 hover:border-gray-300"
                  >
                    <CardContent j={j} location={location} done={done} />
                  </Link>

                  {/* Desktop: select to show right-side detail */}
                  <button
                    onClick={() => setSelected(j)}
                    className={[
                      "hidden w-full text-left rounded-2xl border bg-white p-4 transition lg:block",
                      active ? "ring-2 ring-indigo-200 border-indigo-300" : "hover:border-gray-300",
                    ].join(" ")}
                  >
                    <CardContent j={j} location={location} done={done} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Right detail (desktop only) */}
        <div className="hidden lg:block lg:col-span-7">
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
    </div>
  );
}

function CardContent({ j, location, done }: { j: Job; location: string; done: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
        <div className="mt-1 font-medium line-clamp-2">{j.title || "Untitled"}</div>

        <div className="mt-2 space-y-1 text-sm text-gray-700">
          {j.business_name && (
            <div className="flex items-center gap-2">
              <IconBusiness className="h-4 w-4 text-gray-500" />
              <span className="truncate">{j.business_name}</span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2">
              <IconLocation className="h-4 w-4 text-gray-500" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-gray-500" />
              <span className="truncate">Completed {done}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-900">
            <IconDollar className="h-4 w-4 text-gray-500" />
            <span className="truncate">{costDisplay(j)}</span>
          </div>
        </div>
      </div>

      {j.recommend && (
        <span className="shrink-0 rounded-full bg-green-100 text-green-800 text-xs px-2 py-1">
          Recommended
        </span>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}
