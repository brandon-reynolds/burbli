// components/Feed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

const STATES = ["ALL", "VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type StateFilter = (typeof STATES)[number];

export default function Feed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // simple UI state
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) {
          console.error(error);
          setJobs([]);
        } else {
          setJobs((data ?? []) as Job[]);
        }
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return jobs.filter((j) => {
      const okQ =
        !s ||
        [j.title, j.suburb, j.business_name, j.postcode].some((v) =>
          (v ?? "").toLowerCase().includes(s)
        );
      const okS = stateFilter === "ALL" || j.state === stateFilter;
      return okQ && okS;
    });
  }, [jobs, q, stateFilter]);

  return (
    <section className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by job, business, suburb or postcode"
              className="w-full rounded-xl border pl-9 pr-9 py-2"
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
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1.5 h-7 w-7 grid place-items-center rounded-lg hover:bg-gray-100"
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as StateFilter)}
            className="w-full sm:w-56 rounded-xl border px-3 py-2 text-sm"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All states" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">No results.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((j) => (
            <Link
              key={j.id}
              href={`/post/${j.id}`}
              className="rounded-2xl border bg-white p-4 hover:border-gray-300"
            >
              <div className="font-medium line-clamp-2">{j.title || "Untitled"}</div>
              <div className="mt-1 text-sm text-gray-600">
                {j.business_name ? `${j.business_name} • ` : ""}
                {j.suburb}, {j.state} {j.postcode}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
