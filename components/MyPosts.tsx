// components/MyPosts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

/* Icons match Browse left cards */
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
function monthYear(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-AU", { month: "long", year: "numeric" });
}
function timeAgo(iso: string | null) {
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

export default function MyPosts() {
  const [userId, setUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        window.location.href = "/signin";
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });
      if (!error) setJobs((data ?? []) as Job[]);
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert(`Could not delete. ${error.message ?? ""}`);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setMenuOpenId(null);
  }

  const total = useMemo(() => jobs.length, [jobs]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My posts</h1>
        <a href="/submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
          Share a project
        </a>
      </div>

      {loading && (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
      )}

      {!loading && total === 0 && (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">
          Nothing yet. Share your first project to help neighbours.
        </div>
      )}

      <div className="grid gap-3 pb-10">
        {jobs.map((j) => {
          const done = monthYear(j.done_at);
          const location = [j.suburb, j.state].filter(Boolean).join(", ");
          return (
            <article key={j.id} className="relative rounded-2xl border bg-white p-4 overflow-hidden">
              {/* Make the whole card tappable but keep menu interactive */}
              <a
                href={`/post/${j.id}`}
                className="absolute inset-0"
                aria-label={`Open ${j.title || "post"}`}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Posted {timeAgo(j.created_at)}</div>
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

                {/* Kebab menu */}
                <div className="relative shrink-0" data-menu-root>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
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
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1 w-40 rounded-xl border bg-white p-1 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <a
                        href={`/edit/${j.id}`}
                        role="menuitem"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Edit
                      </a>
                      <button
                        role="menuitem"
                        onClick={() => handleDelete(j.id)}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
