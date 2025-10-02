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

function FeedInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL-backed filters
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [suburbQ, setSuburbQ] = useState<string>(sp.get("suburb") ?? "");
  const [stateQ, setStateQ] = useState<string>(sp.get("state") ?? "");
  const [onlyRecommended, setOnlyRecommended] = useState(sp.get("rec") === "1");

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
    router.replace(`/feed${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [q, suburbQ, stateQ, onlyRecommended, router]);

  // apply filters
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sub = suburbQ.trim().toLowerCase();
    const st = stateQ.trim().toUpperCase();

    return all.filter((j) => {
      const okRec = !onlyRecommended || !!j.recommend;

      const okFreeText =
        !s ||
        [j.title, j.suburb, j.business_name, j.notes]
          .map((v) => (v ?? "").toString().toLowerCase())
          .some((v) => v.includes(s));

      // suburb filter: exact suburb match; if state is present enforce it too
      const okSuburb =
        !sub
          ? true
          : (String(j.suburb ?? "").toLowerCase() === sub &&
             (!st || String(j.state ?? "").toUpperCase() === st));

      return okRec && okFreeText && okSuburb;
    });
  }, [all, q, suburbQ, stateQ, onlyRecommended]);

  // auto-select first in the list on desktop
  useEffect(() => {
    if (!loading && filtered.length && !selected) setSelected(filtered[0]);
    if (!loading && !filtered.length) setSelected(null);
  }, [loading, filtered, selected]);

  const hasAnyFilter = Boolean(q || suburbQ || stateQ || onlyRecommended);

  return (
    <section className="mx-auto max-w-6xl p-4 md:p-8 grid lg:grid-cols-12 gap-6">
      {/* Controls */}
      <div className="lg:col-span-12 rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-3">
          {/* Keyword & Suburb rows (stack on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <input
                className="w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Search by title, business or notes"
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

            <div>
              <SuburbAutocomplete
                label={suburbQ && stateQ ? `${suburbQ}, ${stateQ}` : suburbQ}
                placeholder="Filter by suburb…"
                onPick={(p) => {
                  setSuburbQ(p.suburb ?? "");
                  setStateQ(p.state ?? "");
                }}
                onBlurAutoFillEmpty
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyRecommended}
                onChange={(e) => setOnlyRecommended(e.target.checked)}
              />
              Recommended only
            </label>

            {hasAnyFilter && (
              <button
                onClick={() => {
                  setQ("");
                  setSuburbQ("");
                  setStateQ("");
                  setOnlyRecommended(false);
                }}
                className="text-sm underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500">
            These are <strong>completed</strong> projects shared by neighbours — not open job ads.
          </p>
        </div>
      </div>

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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
                      <div className="mt-1 font-medium line-clamp-2">{j.title || "Untitled"}</div>
                      {j.business_name && (
                        <div className="mt-1 text-sm text-gray-700">{j.business_name}</div>
                      )}
                      {location && (
                        <div className="mt-1 text-sm text-gray-700">{location}</div>
                      )}
                      {done && (
                        <div className="mt-1 text-sm text-gray-700">Completed {done}</div>
                      )}
                      <div className="mt-1 text-sm text-gray-900">{costDisplay(j)}</div>
                    </div>
                    {j.recommend && (
                      <span className="shrink-0 rounded-full bg-green-100 text-green-800 text-xs px-2 py-1">
                        Recommended
                      </span>
                    )}
                  </div>
                </Link>

                {/* Desktop: button selection to show right-side detail */}
                <button
                  onClick={() => setSelected(j)}
                  className={[
                    "hidden w-full text-left rounded-2xl border bg-white p-4 transition lg:block",
                    active ? "ring-2 ring-indigo-200 border-indigo-300" : "hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
                      <div className="mt-1 font-medium line-clamp-2">{j.title || "Untitled"}</div>
                      {j.business_name && (
                        <div className="mt-1 text-sm text-gray-700">{j.business_name}</div>
                      )}
                      {location && (
                        <div className="mt-1 text-sm text-gray-700">{location}</div>
                      )}
                      {done && (
                        <div className="mt-1 text-sm text-gray-700">Completed {done}</div>
                      )}
                      <div className="mt-1 text-sm text-gray-900">{costDisplay(j)}</div>
                    </div>
                    {j.recommend && (
                      <span className="shrink-0 rounded-full bg-green-100 text-green-800 text-xs px-2 py-1">
                        Recommended
                      </span>
                    )}
                  </div>
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
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}
