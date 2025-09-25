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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
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
  }, []);

  async function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert(`Could not delete. ${error.message ?? ""}`);
      return;
    }
    setJobs(prev => prev.filter(j => j.id !== id));
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
        {jobs.map((j) => (
          <div key={j.id} className="relative rounded-2xl border bg-white p-4 hover:shadow-sm transition">
            {/* Full-card public link with return path to /myposts */}
            <Link
              href={`/post/${j.id}?from=${encodeURIComponent("/myposts")}`}
              className="absolute inset-0"
              aria-label={`Open ${j.title ?? "job"}`}
              prefetch={false}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{j.title || "Untitled"}</h3>
                <div className="mt-1 space-y-1 text-sm text-gray-700">
                  {j.business_name && <p className="truncate">{j.business_name}</p>}
                  <p className="truncate">
                    {j.suburb}, {j.state} {j.postcode}
                  </p>
                  <p className="font-medium text-gray-900">{costDisplay(j)}</p>
                </div>
              </div>

              {/* Actions sit above the overlay so they remain clickable */}
              <div className="relative z-10 flex shrink-0 items-center gap-2">
                <Link
                  href={`/edit/${j.id}`}
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={(e) => handleDelete(j.id, e)}
                  className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Posted {timeAgo(j.created_at)}
            </div>
          </div>
        ))}
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
