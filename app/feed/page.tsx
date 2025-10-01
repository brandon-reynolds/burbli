// app/feed/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job as JobT } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

type Job = JobT;
const STATES = ["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;

function useIsDesktop(breakpointPx = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= breakpointPx
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${breakpointPx}px)`);
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [breakpointPx]);
  return isDesktop;
}

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

function formatMonthYear(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-AU", { month: "short", year: "numeric" });
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
    return `$${left}–${right}`;
  }
  return "Cost not shared";
}

/** Inline SVG icons (no external deps) */
const Icon = {
  Building: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 21h18M6 21V7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M6 10h5M6 14h5M6 18h5M15 10h3M15 14h3M15 18h3" />
    </svg>
  ),
  MapPin: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 21s-7-5.33-7-11a7 7 0 1 1 14 0c0 5.67-7 11-7 11Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Dollar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 1v22M17 5.5A4.5 4.5 0 0 0 12 3H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8.5A4.5 4.5 0 0 1 4 10.5" />
    </svg>
  ),
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  ChevronLeft: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
};

function IconRow({
  icon,
  children,
  title,
  className = "",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div title={title} className={`flex items-start gap-2 text-sm ${className}`}>
      <span className="mt-[2px] text-gray-500">{icon}</span>
      <span className="text-gray-700 min-w-0 truncate">{children}</span>
    </div>
  );
}

// Derive comparable numeric cost range for filtering
function getJobCostRange(j: Job): { min: number | null; max: number | null } {
  if (j.cost_type === "exact") {
    const n = Number(j.cost);
    return isFinite(n) ? { min: n, max: n } : { min: null, max: null };
  }
  if (j.cost_type === "range") {
    const a = Number(j.cost_min), b = Number(j.cost_max);
    const min = isFinite(a) ? a : null;
    const max = isFinite(b) ? b : null;
    return { min, max };
  }
  return { min: null, max: null };
}

function FeedInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const isDesktop = useIsDesktop(1024);

  const [all, setAll] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Local filter state (initialised from URL)
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState<string>(sp.get("state") ?? "ALL");
  const [onlyRecommended, setOnlyRecommended] = useState(sp.get("rec") === "1");
  const [minCost, setMinCost] = useState<string>(sp.get("min") ?? "");
  const [maxCost, setMaxCost] = useState<string>(sp.get("max") ?? "");
  const [yearFilter, setYearFilter] = useState<string>(sp.get("year") ?? "ALL");

  const [selected, setSelected] = useState<Job | null>(null);

  // Filters popover / sheet
  const [filtersOpen, setFiltersOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (isDesktop) {
        const el = e.target as HTMLElement | null;
        if (!el || !popRef.current) return;
        if (!popRef.current.contains(el)) setFiltersOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [isDesktop]);

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

  /** Keep local filters in sync when URL changes from outside (e.g. detail links) */
  useEffect(() => {
    const qParam = sp.get("q") ?? "";
    const stParam = sp.get("state") ?? "ALL";
    const recParam = sp.get("rec") === "1";
    const minParam = sp.get("min") ?? "";
    const maxParam = sp.get("max") ?? "";
    const yearParam = sp.get("year") ?? "ALL";
    if (qParam !== q) setQ(qParam);
    if (stParam !== stateFilter) setStateFilter(stParam);
    if (recParam !== onlyRecommended) setOnlyRecommended(recParam);
    if (minParam !== minCost) setMinCost(minParam);
    if (maxParam !== maxCost) setMaxCost(maxParam);
    if (yearParam !== yearFilter) setYearFilter(yearParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Push current filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");
    if (minCost.trim()) params.set("min", minCost.trim());
    if (maxCost.trim()) params.set("max", maxCost.trim());
    if (yearFilter !== "ALL") params.set("year", yearFilter);
    const next = `/feed${params.toString() ? `?${params}` : ""}`;
    const current = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    if (next !== current) router.replace(next, { scroll: false });
  }, [q, stateFilter, onlyRecommended, minCost, maxCost, yearFilter, router]);

  // value for ?from=
  const fromValue = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");
    if (minCost.trim()) params.set("min", minCost.trim());
    if (maxCost.trim()) params.set("max", maxCost.trim());
    if (yearFilter !== "ALL") params.set("year", yearFilter);
    const path = `${pathname}${params.toString() ? `?${params}` : ""}`;
    return encodeURIComponent(path);
  }, [q, stateFilter, onlyRecommended, minCost, maxCost, yearFilter, pathname]);

  // Build a robust haystack for free-text search
  const tokens = useMemo(
    () => q.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [q]
  );

  const matchesTokens = (j: Job) => {
    if (tokens.length === 0) return true;
    const parts = [
      j.title,
      j.business_name,
      j.suburb,
      j.state,
      j.postcode != null ? String(j.postcode) : "",
      `${j.suburb ?? ""} ${j.state ?? ""}`.trim(),
      `${j.suburb ?? ""} ${j.state ?? ""} ${j.postcode ?? ""}`.trim(),
    ].map(v => (v ?? "").toString().toLowerCase());
    const haystack = parts.join(" | ");
    return tokens.every(t => haystack.includes(t));
  };

  // Years available (from done_at)
  const yearsAvailable = useMemo(() => {
    const set = new Set<string>();
    for (const j of all) {
      if (!j.done_at) continue;
      const y = new Date(j.done_at).getFullYear();
      if (!isNaN(y)) set.add(String(y));
    }
    return Array.from(set).sort().reverse(); // newest first
  }, [all]);

  // Base list: query + recommended only + state + cost + year
  const filtered = useMemo(() => {
    const minN = minCost.trim() ? Number(minCost) : null;
    const maxN = maxCost.trim() ? Number(maxCost) : null;
    return all.filter((j) => {
      if (!matchesTokens(j)) return false;
      if (onlyRecommended && !j.recommend) return false;
      if (stateFilter !== "ALL" && j.state !== stateFilter) return false;

      // cost range filter (optional)
      if (minN != null || maxN != null) {
        const { min, max } = getJobCostRange(j);
        if (min == null && max == null) return false; // no cost info — exclude when user set a range
        if (minN != null && (max == null || max < minN)) return false; // job entirely below min
        if (maxN != null && (min == null || min > maxN)) return false; // job entirely above max
      }

      // completed year filter (optional)
      if (yearFilter !== "ALL") {
        const y = j.done_at ? new Date(j.done_at).getFullYear() : NaN;
        if (String(y) !== yearFilter) return false;
      }

      return true;
    });
  }, [all, matchesTokens, onlyRecommended, stateFilter, minCost, maxCost, yearFilter]);

  // desktop auto-select
  useEffect(() => {
    if (!isDesktop) return;
    if (!loading && filtered.length && !selected) setSelected(filtered[0]);
    if (!loading && !filtered.length) setSelected(null);
  }, [loading, filtered, selected, isDesktop]);

  const hasAnyFilter =
    !!q.trim() ||
    stateFilter !== "ALL" ||
    onlyRecommended ||
    !!minCost.trim() ||
    !!maxCost.trim() ||
    yearFilter !== "ALL";

  const activePills: Array<{ label: string; onClear: () => void }> = [];
  if (stateFilter !== "ALL") activePills.push({ label: stateFilter, onClear: () => setStateFilter("ALL") });
  if (onlyRecommended) activePills.push({ label: "Recommended", onClear: () => setOnlyRecommended(false) });
  if (minCost.trim() || maxCost.trim())
    activePills.push({
      label: `${
        minCost.trim() ? `≥ $${Number(minCost).toLocaleString()}` : ""
      }${minCost.trim() && maxCost.trim() ? " · " : ""}${
        maxCost.trim() ? `≤ $${Number(maxCost).toLocaleString()}` : ""
      }`,
      onClear: () => { setMinCost(""); setMaxCost(""); },
    });
  if (yearFilter !== "ALL")
    activePills.push({ label: `Year ${yearFilter}`, onClear: () => setYearFilter("ALL") });

  return (
    <section className="mx-auto max-w-6xl p-4 md:p-8 grid lg:grid-cols-12 gap-6">
      {/* Controls */}
      <div className="lg:col-span-12 rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-3">
          {/* Search + Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-[260px] rounded-xl border p-3"
              placeholder="Search by title, business, suburb or postcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {/* Filters button */}
            <div className={isDesktop ? "relative" : ""} ref={popRef}>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                aria-expanded={filtersOpen}
              >
                <Icon.Filter className="h-4 w-4" />
                Filters
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {filtered.length}
                </span>
              </button>

              {/* Desktop popover */}
              {filtersOpen && isDesktop && (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-white p-4 shadow-lg">
                  {/* State */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">State</div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="state"
                          className="h-4 w-4"
                          checked={stateFilter === "ALL"}
                          onChange={() => setStateFilter("ALL")}
                        />
                        All
                      </label>
                      {STATES.map((s) => (
                        <label key={s} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="state"
                            className="h-4 w-4"
                            checked={stateFilter === s}
                            onChange={() => setStateFilter(s)}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recommended */}
                  <div className="mb-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={onlyRecommended}
                        onChange={(e) => setOnlyRecommended(e.target.checked)}
                      />
                      Recommended only
                    </label>
                  </div>

                  {/* Cost range */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Cost range (A$)</div>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-28 rounded-xl border px-3 py-2 text-sm"
                        placeholder="Min"
                        inputMode="numeric"
                        value={minCost}
                        onChange={(e) => setMinCost(e.target.value.replace(/[^\d]/g, ""))}
                      />
                      <span className="text-gray-500">–</span>
                      <input
                        className="w-28 rounded-xl border px-3 py-2 text-sm"
                        placeholder="Max"
                        inputMode="numeric"
                        value={maxCost}
                        onChange={(e) => setMaxCost(e.target.value.replace(/[^\d]/g, ""))}
                      />
                    </div>
                  </div>

                  {/* Year */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Completed year</div>
                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                    >
                      <option value="ALL">All years</option>
                      {yearsAvailable.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setStateFilter("ALL");
                        setOnlyRecommended(false);
                        setMinCost("");
                        setMaxCost("");
                        setYearFilter("ALL");
                      }}
                      className="text-sm text-gray-700 underline"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasAnyFilter && (
              <button
                onClick={() => {
                  setQ("");
                  setStateFilter("ALL");
                  setOnlyRecommended(false);
                  setMinCost("");
                  setMaxCost("");
                  setYearFilter("ALL");
                }}
                className="text-sm underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {activePills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activePills.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700"
                >
                  {p.label}
                  <button
                    onClick={p.onClear}
                    className="ml-1 rounded hover:bg-gray-200 p-0.5"
                    aria-label={`Clear ${p.label}`}
                    title={`Clear ${p.label}`}
                  >
                    <Icon.X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            These are <span className="font-medium text-gray-700">completed</span> projects shared by neighbours — not open job ads.
          </p>
        </div>
      </div>

      {/* Left list */}
      <div className="lg:col-span-5 space-y-3">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
        ) : (
          filtered.map((j) => {
            const completedLabel = formatMonthYear(j.done_at);

            // MOBILE: link card
            if (!isDesktop) {
              return (
                <Link
                  key={j.id}
                  href={`/post/${j.id}?from=${fromValue}`}
                  className="block rounded-2xl border bg-white p-4 hover:border-gray-300"
                  prefetch={false}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
                      <div className="mt-1 font-semibold line-clamp-2">{j.title || "Untitled"}</div>

                      <div className="mt-2 space-y-1.5">
                        {j.business_name && (
                          <IconRow icon={<Icon.Building className="h-4 w-4" />} title="Business">
                            {j.business_name}
                          </IconRow>
                        )}
                        <IconRow icon={<Icon.MapPin className="h-4 w-4" />} title="Location">
                          {[j.suburb, j.state, j.postcode].filter(Boolean).join(", ")}
                        </IconRow>
                        {completedLabel && (
                          <IconRow icon={<Icon.Calendar className="h-4 w-4" />} title="Completed">
                            <span className="text-gray-700">Completed {completedLabel}</span>
                          </IconRow>
                        )}
                        <IconRow icon={<Icon.Dollar className="h-4 w-4" />} title="Cost">
                          <span className="font-medium text-gray-900">{costDisplay(j)}</span>
                        </IconRow>
                      </div>
                    </div>

                    {j.recommend && (
                      <span className="shrink-0 rounded-full bg-green-100 text-green-800 text-xs px-2 py-1">
                        Recommended
                      </span>
                    )}
                  </div>
                </Link>
              );
            }

            // DESKTOP: selectable card
            const active = selected?.id === j.id;
            return (
              <button
                key={j.id}
                onClick={() => setSelected(j)}
                className={`w-full text-left rounded-2xl border bg-white p-4 hover:border-gray-300 ${active ? "ring-2 ring-indigo-200 border-indigo-300" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">{timeAgo(j.created_at)}</div>
                    <div className="mt-1 font-semibold line-clamp-2">{j.title || "Untitled"}</div>

                    <div className="mt-2 space-y-1.5">
                      {j.business_name && (
                        <IconRow icon={<Icon.Building className="h-4 w-4" />} title="Business">
                          {j.business_name}
                        </IconRow>
                      )}
                      <IconRow icon={<Icon.MapPin className="h-4 w-4" />} title="Location">
                        {[j.suburb, j.state, j.postcode].filter(Boolean).join(", ")}
                      </IconRow>
                      {completedLabel && (
                        <IconRow icon={<Icon.Calendar className="h-4 w-4" />} title="Completed">
                          <span className="text-gray-700">Completed {completedLabel}</span>
                        </IconRow>
                      )}
                      <IconRow icon={<Icon.Dollar className="h-4 w-4" />} title="Cost">
                        <span className="font-medium text-gray-900">{costDisplay(j)}</span>
                      </IconRow>
                    </div>
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

      {/* MOBILE FILTER SHEET */}
      {filtersOpen && !isDesktop && (
        <div className="fixed inset-0 z-40">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />

          {/* sheet */}
          <div className="absolute inset-0 bg-white flex flex-col">
            {/* header */}
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setFiltersOpen(false)}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm"
              >
                <Icon.ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-sm text-gray-600">Filters</div>
              <div className="w-[68px]" />
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* State */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">State</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-3 text-base py-2">
                    <input
                      type="radio"
                      name="m-state"
                      className="h-5 w-5"
                      checked={stateFilter === "ALL"}
                      onChange={() => setStateFilter("ALL")}
                    />
                    All
                  </label>
                  {STATES.map((s) => (
                    <label key={s} className="inline-flex items-center gap-3 text-base py-2">
                      <input
                        type="radio"
                        name="m-state"
                        className="h-5 w-5"
                        checked={stateFilter === s}
                        onChange={() => setStateFilter(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Recommended */}
              <div>
                <label className="inline-flex items-center gap-3 text-base py-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={onlyRecommended}
                    onChange={(e) => setOnlyRecommended(e.target.checked)}
                  />
                  Recommended only
                </label>
              </div>

              {/* Cost range */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Cost range (A$)</div>
                <div className="flex items-center gap-3">
                  <input
                    className="flex-1 rounded-xl border px-3 py-3 text-base"
                    placeholder="Min"
                    inputMode="numeric"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <span className="text-gray-500">–</span>
                  <input
                    className="flex-1 rounded-xl border px-3 py-3 text-base"
                    placeholder="Max"
                    inputMode="numeric"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              </div>

              {/* Year */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Completed year</div>
                <select
                  className="w-full rounded-xl border px-3 py-3 text-base"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="ALL">All years</option>
                  {yearsAvailable.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* footer */}
            <div className="sticky bottom-0 border-t bg-white p-4 space-y-3">
              <button
                onClick={() => {
                  setFiltersOpen(false);
                }}
                className="w-full rounded-xl bg-gray-900 py-3 text-white text-base font-medium"
              >
                Apply filters
              </button>
              <button
                onClick={() => {
                  setStateFilter("ALL");
                  setOnlyRecommended(false);
                  setMinCost("");
                  setMaxCost("");
                  setYearFilter("ALL");
                }}
                className="w-full rounded-xl border py-3 text-base"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
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
