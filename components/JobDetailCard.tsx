// components/JobDetailCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

export default function JobDetailCard({ job }: { job: Job | null }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ignore) setCurrentUserId(user?.id ?? null);
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!el.closest("[data-detail-menu-root]")) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const shareUrl = useMemo(() => {
    if (!job?.id || typeof window === "undefined") return "";
    return `${window.location.origin}/post/${job.id}`;
  }, [job?.id]);

  // ✅ Cost display using canonical fields: cost_type, cost, cost_min, cost_max
  const costDisplay = useMemo(() => {
    if (!job) return "Cost not shared";
    if (job.cost_type === "exact" && job.cost != null && String(job.cost).trim() !== "") {
      const n = Number(job.cost);
      return isFinite(n) ? `$${Math.round(n).toLocaleString()}` : `$${String(job.cost)}`;
    }
    if (job.cost_type === "range" && job.cost_min != null && job.cost_max != null) {
      const minN = Number(job.cost_min);
      const maxN = Number(job.cost_max);
      const left = isFinite(minN) ? Math.round(minN).toLocaleString() : String(job.cost_min);
      const right = isFinite(maxN) ? Math.round(maxN).toLocaleString() : String(job.cost_max);
      return `$${left}–$${right}`;
    }
    return "Cost not shared";
  }, [job]);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  async function deleteHere() {
    if (!job?.id || !currentUserId) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", job.id).eq("owner_id", currentUserId);
    if (error) {
      alert(`Could not delete. ${error.message ?? ""}`);
      return;
    }
    window.location.href = "/feed";
  }

  function reportHere() {
    alert("Thanks for the report — we’ll review this post.");
    setMenuOpen(false);
  }

  if (!job) {
    return <div className="rounded-2xl border bg-white p-6 text-gray-500">Select a job to view details.</div>;
  }

  const isMine = currentUserId && job.owner_id === currentUserId;

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs text-gray-500">{timeAgo(job.created_at)}</span>

        <div className="flex items-center gap-2" data-detail-menu-root>
          {job.recommend != null && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${
                job.recommend
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }`}
            >
              {job.recommend ? "Recommended" : "Not recommended"}
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More actions"
              title="More actions"
            >
              ⋯
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-40 rounded-xl border bg-white p-1 shadow-lg">
                {isMine ? (
                  <>
                    <Link
                      href={`/edit/${job.id}`}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <button
                      role="menuitem"
                      onClick={deleteHere}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    role="menuitem"
                    onClick={reportHere}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
        {job.title || "Untitled job"}
      </h2>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Who did it</div>
        {job.business_name ? (
          <Link href={`/feed?q=${encodeURIComponent(job.business_name)}`} className="mt-1 inline-block text-base underline">
            {job.business_name}
          </Link>
        ) : (
          <div className="mt-1 text-base text-gray-600">Not specified</div>
        )}
      </section>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</div>
        <div className="mt-1 text-base">
          {job.suburb ? (
            <Link
              href={`/feed?q=${encodeURIComponent(`${job.suburb} ${job.state ?? ""}`.trim())}`}
              className="underline"
            >
              {job.suburb}
            </Link>
          ) : (
            "—"
          )}
          {job.state ? `, ${job.state}` : ""} {job.postcode ? job.postcode : ""}
        </div>
      </section>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</div>
        {/* smaller text to match other fields */}
        <div className="mt-1 text-base">{costDisplay}</div>
      </section>

      {job.notes && (
        <section className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</div>
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-gray-800">{job.notes}</p>
        </section>
      )}

      <div className="mt-8 border-t pt-5">
        <p className="text-sm text-gray-600">
          {job.suburb
            ? `Had something similar done in ${job.suburb}? Share it to help neighbours know what to expect.`
            : "Had something similar done? Share it to help neighbours know what to expect."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/submit"
            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Share your project
          </Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </article>
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
