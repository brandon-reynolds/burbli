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
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(
        Math.round(cents / 100)
      )
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
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<(typeof STATES)[number]>("ALL");
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const pageRef = useRef(0);
  const PAGE = 12;

  // Debounce search input a bit
  const debouncedQ = useMemo(() => q.trim(), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      // reset list when filters change
      pageRef.current = 0;
      setItems([]);
      setCanLoadMore(true);
      void loadPage(true);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, stateFilter, onlyRecommended]);

  useEffect(() => {
    void loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(reset = false) {
    if (loading) return;
    if (!canLoadMore && !reset) return;

    setLoading(true);

    let query = supabase
      .from("jobs")
      .select(
        "id,title,business_name,suburb,state,postcode,recommend,cost_type,cost_amount,cost_min,cost_max,notes,created_at",
      )
      .order("created_at", { ascending: false });

    // filter: state
    if (stateFilter !== "ALL") {
      query = query.eq("state", stateFilter);
    }
    // filter: recommended
    if (onlyRecommended) {
      query = query.eq("recommend", true);
    }
    // filter: search text across a few fields
    if (debouncedQ) {
      const p = `%${debouncedQ}%`;
      query = query.or(
        `title.ilike.${p},business_name.ilike.${p},suburb.ilike.${p},postcode.ilike.${p}`
      );
    }

    const offset = reset ? 0 : pageRef.current * PAGE;
    const to = offset + PAGE - 1;
    const { data, error } = await query.range(offset, to);

    if (!error && data) {
      setItems((prev) => (reset ? data : [...prev, ...data]));
      if (data.length < PAGE) setCanLoadMore(false);
      if (reset) pageRef.current = 1;
      else pageRef.current += 1;
    } else {
      console.error(error);
    }
    setLoading(false);
  }

  const countText =
    items.length === 0 && !loading
      ? "No results"
      : `${items.length}${canLoadMore ? "+" : ""} results`;

  return (
    <section className="space-y-4">
      {/* Header / Filters */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <input
              className="w-full rounded-xl border pl-9 pr-3 py-2"
              placeholder="Search by job, business, suburb, or postcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-500"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                d="M21 21l-4.3-4.3m1.1-5.1a6.8 6.8 0 11-13.6 0 6.8 6.8 0 0113.6 0z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* State pills */}
          <div className="flex flex-wrap gap-2">
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

          {/* Recommended toggle */}
          <label className="inline-flex items-center gap-2 text-sm ml-auto">
            <input
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
            />
            Recommended only
          </label>
        </div>

        {/* Count */}
        <div className="mt-2 text-xs text-gray-500">{countText}</div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {items.map((j) => (
          <JobRow key={j.id} job={j} />
        ))}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-4 animate-pulse">
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="mt-3 h-3 w-1/3 bg-gray-200 rounded" />
                <div className="mt-4 h-3 w-2/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load more */}
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
    </section>
  );
}

function JobRow({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);

  const c = costLabel(job);
  const isNegative = job.recommend === false;

  const link = `/post/${job.id}`;

  function copy() {
    const url = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  const notes = job.notes?.trim() ?? "";
  const short = notes.length > 160 && !expanded ? notes.slice(0, 160) + "…" : notes;

  return (
    <article className="rounded-2xl border bg-white p-4 md:p-5">
      {/* Top line: Title + rec badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-tight">
          {job.title || "Untitled job"}
        </h3>
        <span
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-xs border",
            isNegative
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-green-50 text-green-800 border-green-200",
          ].join(" ")}
          title={isNegative ? "Not recommended" : "Recommended"}
        >
          {isNegative ? "Not recommended" : "Recommended"}
        </span>
      </div>

      {/* Meta line */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        {job.business_name && (
          <span className="rounded-lg border px-2 py-1 bg-gray-50">
            {job.business_name}
          </span>
        )}
        <span className="rounded-lg border px-2 py-1 bg-gray-50">
          {job.suburb}, {job.state} {job.postcode}
        </span>
        <span className="rounded-lg border px-2 py-1 bg-gray-50">{c}</span>
        <span className="text-xs text-gray-400 ml-auto">{since(job.created_at)}</span>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-3 text-sm text-gray-800">
          {short}{" "}
          {notes.length > 160 && (
            <button onClick={() => setExpanded((v) => !v)} className="underline">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <a href={link} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50">
          Open
        </a>
        <button onClick={copy} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50">
          Copy link
        </button>
      </div>
    </article>
  );
}
