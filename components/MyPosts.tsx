// components/MyPosts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My posts</h1>
        <Link href="/submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
          Share a project
        </Link>
      </div>

      {loading && <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}

      {!loading && total === 0 && (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">
          Nothing yet. Share your first project to help neighbours.
        </div>
      )}

      <div className="grid gap-3">
        {jobs.map((j) => {
          const location = [j.suburb, j.state, j.postcode].filter(Boolean).join(", ");
          return (
            <Link
              key={j.id}
              href={`/post/${j.id}`}
              className="relative rounded-2xl border bg-white p-4 flex items-start justify-between gap-3 hover:border-gray-300"
            >
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{j.title || "Untitled"}</h3>
                <div className="mt-1 space-y-1 text-sm text-gray-700">
                  {j.business_name && <p className="truncate">{j.business_name}</p>}
                  <p className="truncate">{location}</p>
                  <p>{costDisplay(j)}</p>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Posted {timeAgo(j.created_at)}
                </div>
              </div>

              <div className="relative shrink-0" data-menu-root>
                <button
                  onClick={(e) => { e.preventDefault(); setMenuOpenId((cur) => (cur === j.id ? null : j.id)); }}
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/edit/${j.id}`}
                      role="menuitem"
                      onClick={() => setMenuOpenId(null)}
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <button
                      role="menuitem"
                      onClick={(e) => { e.preventDefault(); handleDelete(j.id); }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
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
