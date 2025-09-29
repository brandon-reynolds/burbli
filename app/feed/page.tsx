// app/feed/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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

  /** Keep local filters in sync when URL changes from outside (e.g. detail links) */
  useEffect(() => {
    const qParam = sp.get("q") ?? "";
    const stParam = sp.get("state") ?? "ALL";
    const recParam = sp.get("rec") === "1";
    if (qParam !== q) setQ(qParam);
    if (stParam !== stateFilter) setStateFilter(stParam);
    if (recParam !== onlyRecommended) setOnlyRecommended(recParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Push current filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");
    const next = `/feed${params.toString() ? `?${params}` : ""}`;
    const current = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    if (next !== current) router.replace(next, { scroll: false });
  }, [q, stateFilter, onlyRecommended, router]);

  // value for ?from=
  const fromValue = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (onlyRecommended) params.set("rec", "1");
    const path = `${pathname}${params.toString() ? `?${params}` : ""}`;
    return encodeURIComponent(path);
  }, [q, stateFilter, onlyRecommended, pathname]);

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

  // ✅ Base list used for counts: query + recOnly applied, NOT state filter
  const baseCandidates = useMemo(
    () => all.filter(j => matchesTokens(j) && (!onlyRecommended || !!j.recommend)),
    [all, tokens, onlyRecommended]
  );

  // ✅ Counts that reflect current query + recOnly
  const counts = useMemo(() => {
    const byState: Record<string, number> = Object.fromEntries(
      (["ALL", ...STATES] as const).map(s => [s, 0])
    );
    byState.ALL = baseCandidates.length;
    for (const j of baseCandidates) {
      const st = (j.state ?? "") as (typeof STATES)[number];
      if (STATES.includes(st)) byState[st] = (byState[st] ?? 0) + 1;
    }
    return byState;
  }, [baseCandidates]);

  // Final filtered list shown on the left (applies state filter to baseCandidates)
  const filtered = useMemo(() => {
    return baseCandidates.filter(j => stateFilter === "ALL" || j.state === stateFilter);
  }, [baseCandidates, stateFilter]);

  // desktop auto-select
  useEffect(() => {
    if (!isDesktop) return;
    if (!loading && filtered.length && !selected) setSelected(filtered[0]);
    if (!loading && !filtered.length) setSelected(null);
  }, [loading, filtered, selected, isDesktop]);

  return (
    <section className="mx-auto max-w-6xl p-4 md:p-8 grid lg:grid-cols-12 gap-6">
      {/* Controls */}
      <div className="lg:col-span-12 rounded-2xl border bg-white p-4">
        <div className="flex flex-col gap-2">
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
                ALL ({counts.ALL ?? 0})
              </button>
              {STATES.map(s => (
                <button
                  key={s}
                  onClick={() => setStateFilter(s)}
                  className={`px-3 py-2 rounded-full text-sm ${stateFilter===s?"bg-black text-white":"bg-gray-100"}`}
                >
                  {s} ({counts[s] ?? 0})
                </button>
              ))}
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
                  href={`/post/${j.id}?from=${encodeURIComponent(`${pathname}${window.location.search}`)}`}
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
