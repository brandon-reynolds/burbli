// app/feed/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";

type Job = {
  id: string;
  title: string;
  business_name: string | null;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  recommend: boolean;
  cost_type: "exact" | "range" | "hidden";
  cost_amount?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  created_at: string;
};

const STATE_LIST = ["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;
const STATES = ["ALL", ...STATE_LIST] as const;

const fmtAUD = (cents?: number | null) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
        .format(Math.round(cents / 100))
    : null;

function costLabel(j: Job) {
  if (j.cost_type === "exact" && j.cost_amount) return fmtAUD(j.cost_amount);
  if (j.cost_type === "range" && j.cost_min && j.cost_max)
    return `${fmtAUD(j.cost_min)} – ${fmtAUD(j.cost_max)}`;
  return "Cost not shared";
}

function since(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function FeedPage() {
  // Wrap useSearchParams in Suspense (Next.js requirement)
  return (
    <Suspense fallback={<div className="text-sm text-gray-600">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}

function FeedInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial values from URL
  const initialQ = (searchParams.get("q") ?? "").trim();
  const rawState = (searchParams.get("state") ?? "ALL").toUpperCase();
  const initialState: (typeof STATES)[number] = (STATES as readonly string[]).includes(rawState)
    ? (rawState as any)
    : "ALL";
  const initialRec = searchParams.get("rec") === "1";

  // filters
  const [q, setQ] = useState(initialQ);
  const [stateFilter, setStateFilter] = useState<(typeof STATES)[number]>(initialState);
  const [onlyRecommended, setOnlyRecommended] = useState(initialRec);

  // keep local state in sync if URL changes (e.g., clicking suburb/business)
  useEffect(() => {
    const nextQ = (searchParams.get("q") ?? "").trim();
    const nextStateRaw = (searchParams.get("state") ?? "ALL").toUpperCase();
    const nextState = (STATES as readonly string[]).includes(nextStateRaw) ? (nextStateRaw as any) : "ALL";
    const nextRec = searchParams.get("rec") === "1";

    setQ(nextQ);
    setStateFilter(nextState);
    setOnlyRecommended(nextRec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // state counts (respect q + recommended, independent of selected state)
  const [stateCounts, setStateCounts] = useState<Record<string, number>>({});
  const [allCount, setAllCount] = useState<number>(0);

  // data / paging
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const pageRef = useRef(0);
  const PAGE = 16;

  // desktop selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // debounce search text
  const debouncedQ = useMemo(() => q.trim(), [q]);

  // Sync URL with filters (so the select shows selected state, and sharing the page preserves filters)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `/feed?${next}` : "/feed", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, stateFilter, onlyRecommended]);

  // Load list when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      pageRef.current = 0;
      setItems([]);
      setCanLoadMore(true);
      void loadPage(true);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, stateFilter, onlyRecommended]);

  // Initial load
  useEffect(() => { void loadPage(true); }, []); // eslint-disable-line

  // Keep selection valid
  useEffect(() => {
    if (items.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !items.find(i => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  // Load counts (reflect current q/recommended)
  useEffect(() => {
    let ignore = false;
    async function loadCounts() {
      const p = debouncedQ ? `%${debouncedQ}%` : null;
      const promises = STATE_LIST.map(async (s) => {
        let qy = supabase.from("jobs").select("id", { count: "exact", head: true }).eq("state", s);
        if (onlyRecommended) qy = qy.eq("recommend", true);
        if (p) qy = qy.or(`title.ilike.${p},business_name.ilike.${p},suburb.ilike.${p},postcode.ilike.${p}`);
        const { count, error } = await qy;
        return [s, error ? 0 : (count ?? 0)] as const;
      });
      const results = await Promise.all(promises);
      if (ignore) return;
      const map: Record<string, number> = {};
      let total = 0;
      for (const [s, c] of results) { map[s] = c; total += c; }
      setStateCounts(map);
      setAllCount(total);
    }
    loadCounts();
    return () => { ignore = true; };
  }, [debouncedQ, onlyRecommended]);

  async function loadPage(reset = false) {
    if (loading) return;
    if (!canLoadMore && !reset) return;
    setLoading(true);

    let qy = supabase
      .from("jobs")
      .select("id,title,business_name,suburb,state,postcode,recommend,cost_type,cost_amount,cost_min,cost_max,notes,created_at")
      .order("created_at", { ascending: false });

    if (stateFilter !== "ALL") qy = qy.eq("state", stateFilter);
    if (onlyRecommended) qy = qy.eq("recommend", true);
    if (debouncedQ) {
      const p = `%${debouncedQ}%`;
      qy = qy.or(`title.ilike.${p},business_name.ilike.${p},suburb.ilike.${p},postcode.ilike.${p}`);
    }

    const offset = reset ? 0 : pageRef.current * PAGE;
    const to = offset + PAGE - 1;
    const { data, error } = await qy.range(offset, to);

    if (!error && data) {
      setItems(prev => reset ? data : [...prev, ...data]);
      if (data.length < PAGE) setCanLoadMore(false);
      pageRef.current = reset ? 1 : pageRef.current + 1;
    } else {
      console.error(error);
    }
    setLoading(false);
  }

  const selected = items.find(i => i.id === selectedId) || null;

  const isDesktop = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches; // Tailwind lg breakpoint

  function clearAll() {
    setQ("");
    setStateFilter("ALL");
    setOnlyRecommended(false);
    router.replace("/feed", { scroll: false });
    pageRef.current = 0;
    setItems([]);
    setCanLoadMore(true);
    void loadPage(true);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      {/* LEFT: search + filters + cards */}
      <div className="lg:col-span-5 lg:pr-2">
        {/* Search & filters */}
        <div className="rounded-2xl border bg-white p-3 md:p-4">
          {/* Search with clear (✕) */}
          <div className="relative">
            <input
              className="w-full rounded-xl border pl-9 pr-9 py-2"
              placeholder="Search job, business, suburb, postcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" viewBox="0 0 24 24" aria-hidden>
              <path d="M21 21l-4.3-4.3m1.1-5.1a6.8 6.8 0 11-13.6 0 6.8 6.8 0 0113.6 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1.5 h-7 w-7 grid place-items-center rounded-lg hover:bg-gray-100"
                aria-label="Clear search"
                title="Clear"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Compact filter row: State selector + Recommended + Clear filters */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="sr-only" htmlFor="stateSelect">State</label>
              <select
                id="stateSelect"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as any)}
              >
                <option value="ALL">All states ({allCount})</option>
                {STATE_LIST.map(s => (
                  <option key={s} value={s}>
                    {s} ({stateCounts[s] ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyRecommended}
                  onChange={(e) => setOnlyRecommended(e.target.checked)}
                />
                Recommended only
              </label>

              <button
                type="button"
                onClick={clearAll}
                className="text-sm underline text-gray-700 hover:text-gray-900"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Cards – separated with gaps, subtle selected state */}
        <div className="mt-3 grid gap-2">
          {items.length === 0 && !loading && (
            <div className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-600">
              No results
            </div>
          )}

          {items.map((j) => {
            const link = `/post/${j.id}`;
            const selectedClasses =
              selectedId === j.id && isDesktop()
                ? "bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200"
                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300";

            return (
              <button
                key={j.id}
                onClick={() => {
                  if (isDesktop()) setSelectedId(j.id);
                  else window.location.href = link;
                }}
                aria-current={selectedId === j.id ? "true" : undefined}
                className={[
                  "text-left rounded-xl border px-4 py-3 transition",
                  selectedClasses,
                ].join(" ")}
              >
                <div className="space-y-1.5">
                  <h3 className="font-medium leading-tight line-clamp-2">
                    {j.title || "Untitled job"}
                  </h3>

                  {j.business_name && (
                    <div className="text-[13px] text-gray-700">
                      {j.business_name}
                    </div>
                  )}

                  <div className="text-[13px] text-gray-600">
                    {j.suburb}, {j.state} {j.postcode}
                  </div>

                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <span>{costLabel(j)}</span>
                    <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] border bg-gray-50 text-gray-700">
                      {j.recommend ? "Recommended" : "Not recommended"}
                    </span>
                    <span className="text-[12px] text-gray-400">{since(j.created_at)}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-white px-4 py-3">
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                  <div className="mt-2 h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </>
          )}
        </div>

        {!loading && canLoadMore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => loadPage(false)}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: detail pane (sticky on desktop) */}
      <div className="hidden lg:block lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <JobDetailCard job={selected} />
        </div>
      </div>
    </section>
  );
}
