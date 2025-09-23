// app/feed/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  business_name: string | null;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  recommend: boolean;
  cost_type: "exact" | "range" | "hidden";
  cost_amount?: number | null; // cents
  cost_min?: number | null;    // cents
  cost_max?: number | null;    // cents
  notes?: string | null;
  created_at: string;
};

const STATES = ["ALL","VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;

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
  // filters
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<(typeof STATES)[number]>("ALL");
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  // data / paging
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const pageRef = useRef(0);
  const PAGE = 16;

  // desktop selection (hidden on mobile)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // debounce q
  const debouncedQ = useMemo(() => q.trim(), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      pageRef.current = 0;
      setItems([]);
      setCanLoadMore(true);
      void loadPage(true);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, stateFilter, onlyRecommended]);

  useEffect(() => { void loadPage(true); }, []); // eslint-disable-line

  // keep selection valid on desktop
  useEffect(() => {
    if (items.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !items.find(i => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  async function loadPage(reset = false) {
    if (loading) return;
    if (!canLoadMore && !reset) return;

    setLoading(true);

    let query = supabase
      .from("jobs")
      .select("id,title,business_name,suburb,state,postcode,recommend,cost_type,cost_amount,cost_min,cost_max,notes,created_at")
      .order("created_at", { ascending: false });

    if (stateFilter !== "ALL") query = query.eq("state", stateFilter);
    if (onlyRecommended) query = query.eq("recommend", true);
    if (debouncedQ) {
      const p = `%${debouncedQ}%`;
      query = query.or(`title.ilike.${p},business_name.ilike.${p},suburb.ilike.${p},postcode.ilike.${p}`);
    }

    const offset = reset ? 0 : pageRef.current * PAGE;
    const to = offset + PAGE - 1;
    const { data, error } = await query.range(offset, to);

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

  // helper to decide mobile vs desktop at click time
  const isDesktop = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches; // Tailwind lg breakpoint

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      {/* LEFT: filters + list */}
      <div className="lg:col-span-5 lg:pr-2">
        <div className="rounded-2xl border bg-white p-3 md:p-4">
          {/* Search */}
          <div className="relative">
            <input
              className="w-full rounded-xl border pl-9 pr-3 py-2"
              placeholder="Search job, business, suburb, postcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" viewBox="0 0 24 24" aria-hidden>
              <path d="M21 21l-4.3-4.3m1.1-5.1a6.8 6.8 0 11-13.6 0 6.8 6.8 0 0113.6 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          {/* State pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs border",
                  stateFilter === s ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Recommended only */}
          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
            />
            Recommended only
          </label>
        </div>

        {/* List */}
        <div className="mt-3 rounded-2xl border bg-white overflow-hidden">
          <ul className="divide-y">
            {items.length === 0 && !loading && (
              <li className="px-4 py-6 text-sm text-gray-600">No results</li>
            )}

            {items.map((j) => {
              const link = `/post/${j.id}`;
              return (
                <li key={j.id}>
                  <button
                    onClick={() => {
                      if (isDesktop()) setSelectedId(j.id);
                      else window.location.href = link; // mobile: navigate to details page
                    }}
                    aria-current={selectedId === j.id ? "true" : undefined}
                    className={[
                      "w-full text-left px-4 py-3 transition",
                      selectedId === j.id && isDesktop()
                        ? "bg-gray-50 ring-inset ring-2 ring-gray-900"
                        : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={[
                          "mt-1 inline-block h-2 w-2 rounded-full",
                          j.recommend ? "bg-green-600" : "bg-red-600",
                        ].join(" ")}
                        aria-hidden
                      />
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <h3 className="font-medium leading-tight line-clamp-1">
                            {j.title || "Untitled job"}
                          </h3>
                          <span className="ml-auto shrink-0 text-xs text-gray-400">
                            {since(j.created_at)}
                          </span>
                        </div>

                        <div className="mt-1 text-[13px] text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {j.business_name && <span className="truncate">{j.business_name}</span>}
                          <span className="truncate">{j.suburb}, {j.state} {j.postcode}</span>
                          <span className="truncate">{costLabel(j)}</span>
                          <span
                            className={[
                              "ml-auto rounded-full px-2 py-0.5 text-[11px] border",
                              j.recommend
                                ? "bg-green-50 text-green-800 border-green-200"
                                : "bg-red-50 text-red-800 border-red-200",
                            ].join(" ")}
                          >
                            {j.recommend ? "Recommended" : "Not recommended"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}

            {loading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                    <div className="mt-2 h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                  </li>
                ))}
              </>
            )}
          </ul>
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

      {/* RIGHT: detail pane (hidden on mobile) */}
      <div className="hidden lg:block lg:col-span-7">
        <DetailPane job={selected} />
      </div>
    </section>
  );
}

function DetailPane({ job }: { job: Job | null }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!job) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
        Select a job from the list to see details.
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/post/${job.id}` : `/post/${job.id}`;

  async function shareNative() {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({
          title: job.title || "Burbli job",
          text: "Found this job on Burbli — could be useful.",
          url: shareUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 1200);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      // ignored
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const chip = job.recommend
    ? "bg-green-50 text-green-800 border-green-200"
    : "bg-red-50 text-red-800 border-red-200";

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      {/* summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-gray-500">{since(job.created_at)}</div>
        <span className={`rounded-full px-2 py-0.5 text-xs border ${chip}`}>
          {job.recommend ? "Recommended" : "Not recommended"}
        </span>
      </div>

      {/* FIELD: Title */}
      <section className="mt-2">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Title</div>
        <h2 className="mt-1 text-2xl font-semibold leading-snug">
          {job.title || "Untitled job"}
        </h2>
      </section>

      {/* quick tags (location) */}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {job.business_name && (
          <span className="rounded-lg border bg-gray-50 px-2 py-1">{job.business_name}</span>
        )}
        <span className="rounded-lg border bg-gray-50 px-2 py-1">
          {job.suburb}, {job.state} {job.postcode}
        </span>
      </div>

      {/* FIELD: Who did it */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Who did it</div>
        <div className="mt-1 text-[15px] text-gray-900">
          {job.business_name || "Not specified"}
        </div>
      </section>

      {/* FIELD: Cost */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Cost</div>
        <div className="mt-1 text-xl font-semibold">{costLabel(job)}</div>
      </section>

      {/* FIELD: Details */}
      <section className="mt-6">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">Details</div>
        <div className="mt-2 text-[15px] leading-6 text-gray-900 whitespace-pre-wrap">
          {job.notes?.trim() || "—"}
        </div>
      </section>

      {/* CTAs */}
      <section className="mt-8 flex flex-wrap gap-2">
        <a
          href="/submit"
          className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
        >
          Share your job
        </a>
        <button
          onClick={shareNative}
          className="px-4 py-2 rounded-xl border hover:bg-gray-50"
        >
          {shared ? "Shared!" : "Share with a friend"}
        </button>
        <button
          onClick={copyLink}
          className="px-4 py-2 rounded-xl border hover:bg-gray-50"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </section>
    </article>
  );
}
