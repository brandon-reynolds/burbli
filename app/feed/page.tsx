// app/feed/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job as JobT } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

type Job = JobT;
const STATES = ["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;

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
  const sp = useSearchParams();

  const [all, setAll] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState<string>(sp.get("state") ?? "ALL");
  const [onlyRecommended, setOnlyRecommended] = useState(sp.get("rec") === "1");
  const [selected, setSelected] = useState<Job | null>(null);

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

  // keep URL in sync (nice for sharing and back/forward)
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");
    router.replace(`/feed${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [q, stateFilter, onlyRecommended, router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((j) => {
      const okQ =
        !s ||
        [j.title, j.suburb, j.business_name, String(j.postcode)]
          .map(v => (v ?? "").toString().toLowerCase())
          .some(v => v.includes(s));
      const okS = stateFilter === "ALL" || j.state === stateFilter;
      const okR = !onlyRecommended || !!j.recommend;
      return okQ && okS && okR;
    });
  }, [all, q, stateFilter, onlyRecommended]);

  // auto-select first
  useEffect(() => {
    if (!loading && filtered.length && !selected) setSelected(filtered[0]);
    if (!loading && !filtered.length) setSelected(null);
  }, [loading, filtered, selected]);

  return (
    <section className="mx-auto max-w-6xl p-4 md:p-8 grid lg:grid-cols-12 gap-6">
      {/* Controls */}
      <div className="lg:col-span-12 rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[260px] rounded-xl border p-3"
            placeholder="Search by title, business, suburb or postcode"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStateFilter("ALL")}
              className={`px-3 py-2 rounded-full text-sm ${stateFilter==="ALL"?"bg-black text-white":"bg-gray-100"}`}
            >
              ALL ({all.length})
            </button>
            {STATES.map(s => {
              const count = all.filter(j => j.state === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStateFilter(s)}
                  className={`px-3 py-2 rounded-full text-sm ${stateFilter===s?"bg-black text-white":"bg-gray-100"}`}
                >
                  {s} ({count})
                </button>
              );
            })}
            <label className="ml-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyRecommended}
                onChange={(e)=>setOnlyRecommended(e.target.checked)}
              />
              Recommended only
            </label>
            {(q || stateFilter!=="ALL" || onlyRecommended) && (
              <button
                onClick={() => { setQ(""); setStateFilter("ALL"); setOnlyRecommended(false); }}
                className="text-sm underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Left list (ALWAYS shows cost) */}
      <div className="lg:col-span-5 space-y-3">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
        ) : (
          filtered.map((j) => {
            const active = selected?.id === j.id;
            return (
              <button
                key={j.id}
                onClick={() => setSelected(j)}
                className={`w-full text-left rounded-2xl border bg-white p-4 hover:border-gray-300 ${active ? "ring-2 ring-indigo-200 border-indigo-300" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
                    <div className="mt-1 font-medium line-clamp-2">{j.title || "Untitled"}</div>
                    <div className="mt-1 text-sm text-gray-700">{j.business_name || "—"}</div>
                    <div className="mt-1 text-sm text-gray-700">{j.suburb}, {j.state} {j.postcode}</div>
                    <div className="mt-1 text-sm text-gray-900">{costDisplay(j)}</div>
                  </div>
                  {j.recommend && (
                    <span className="shrink-0 rounded-full bg-green-100 text-green-800 text-xs px-2 py-1">
                      Recommended
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Right detail */}
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
