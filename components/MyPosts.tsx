// components/MyPosts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Draft = {
  title: string | null;
  business_name: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  recommend: boolean | null;
  cost_type: "exact" | "range" | "na" | null;
  cost_exact?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
};

export default function MyPosts() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Job[]>([]);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    title: null,
    business_name: null,
    suburb: null,
    state: "VIC",
    postcode: null,
    recommend: true,
    cost_type: "na",
    cost_exact: null,
    cost_min: null,
    cost_max: null,
    notes: null,
  });

  // auth + load
  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== "undefined") window.location.href = "/signin";
        return;
      }
      if (ignore) return;
      setUserId(user.id);

      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) {
          console.error(error);
          setItems([]);
        } else {
          setItems((data ?? []) as Job[]);
        }
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  const costHelp = useMemo(() => {
    if (draft.cost_type === "exact") return "Exact total (AUD) — whole number, e.g. 2500";
    if (draft.cost_type === "range") return "Enter min and max (AUD) — whole numbers";
    return "If you’d prefer not to share cost, leave it hidden.";
  }, [draft.cost_type]);

  async function save() {
    // Null-safe trims
    const title = (draft.title ?? "").trim();
    const suburb = (draft.suburb ?? "").trim();
    const business = (draft.business_name ?? "").trim();
    const postcode = (draft.postcode ?? "").trim();
    const state = (draft.state ?? "").trim();

    // Basic validation
    if (!title || !suburb || !state || !/^\d{4}$/.test(postcode) || !business) {
      alert("Please complete required fields: title, who did it, suburb, state, 4-digit postcode.");
      return;
    }

    // Cost validation
    if (draft.cost_type === "exact") {
      const n = Number(draft.cost_exact);
      if (!Number.isFinite(n) || n < 0) {
        alert("Please enter a valid exact cost (whole number).");
        return;
      }
    } else if (draft.cost_type === "range") {
      const min = Number(draft.cost_min);
      const max = Number(draft.cost_max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
        alert("Please enter a valid cost range (min ≤ max, whole numbers).");
        return;
      }
    }

    if (!userId) return;

    setSaving(true);
    // Build payload aligned with your Job schema
    const payload: Partial<Job> = {
      owner_id: userId,
      title,
      business_name: business,
      suburb,
      state,
      postcode,
      recommend: draft.recommend ?? true,
      cost_type: draft.cost_type,
      cost_exact: draft.cost_type === "exact" ? Number(draft.cost_exact) : null,
      cost_min: draft.cost_type === "range" ? Number(draft.cost_min) : null,
      cost_max: draft.cost_type === "range" ? Number(draft.cost_max) : null,
      notes: (draft.notes ?? "").trim() || null,
    };

    const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Could not save. Please try again.");
      return;
    }

    // Prepend to list
    setItems((prev) => [data as Job, ...prev]);

    // Reset draft (keep state for convenience)
    setDraft({
      title: null,
      business_name: null,
      suburb: null,
      state,
      postcode: null,
      recommend: true,
      cost_type: "na",
      cost_exact: null,
      cost_min: null,
      cost_max: null,
      notes: null,
    });
  }

  return (
    <section className="space-y-6">
      {/* Compose card */}
      <article className="rounded-2xl border bg-white p-5 md:p-6">
        <h2 className="text-lg font-semibold">Share your project</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tell neighbours about work you’ve already had done — whether you’d recommend it or not.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Title *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="e.g., New Colorbond roof installed"
              value={draft.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Who did it *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Business or tradie name"
              value={draft.business_name ?? ""}
              onChange={(e) => set("business_name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Recommend?</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={String(draft.recommend ?? true)}
              onChange={(e) => set("recommend", e.target.value === "true")}
            >
              <option value="true">Yes, I recommend</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Suburb *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="e.g., Epping"
              value={draft.suburb ?? ""}
              onChange={(e) => set("suburb", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">State *</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={draft.state ?? "VIC"}
              onChange={(e) => set("state", e.target.value)}
            >
              {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Postcode *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="4 digits"
              inputMode="numeric"
              pattern="\d{4}"
              value={draft.postcode ?? ""}
              onChange={(e) => set("postcode", e.target.value.replace(/[^\d]/g, "").slice(0,4))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Cost</label>
            <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select
                className="rounded-xl border px-3 py-2"
                value={draft.cost_type ?? "na"}
                onChange={(e) => set("cost_type", e.target.value as Draft["cost_type"])}
              >
                <option value="na">Prefer not to say</option>
                <option value="exact">Exact</option>
                <option value="range">Range</option>
              </select>

              {draft.cost_type === "exact" && (
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="Exact amount"
                  inputMode="numeric"
                  value={draft.cost_exact ?? ""}
                  onChange={(e) => set("cost_exact", Number(e.target.value.replace(/[^\d]/g, "")) || null)}
                />
              )}

              {draft.cost_type === "range" && (
                <>
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="Min"
                    inputMode="numeric"
                    value={draft.cost_min ?? ""}
                    onChange={(e) => set("cost_min", Number(e.target.value.replace(/[^\d]/g, "")) || null)}
                  />
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="Max"
                    inputMode="numeric"
                    value={draft.cost_max ?? ""}
                    onChange={(e) => set("cost_max", Number(e.target.value.replace(/[^\d]/g, "")) || null)}
                  />
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">{costHelp}</p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Details</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={5}
              placeholder="Any context you’d like to share…"
              value={draft.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Share project"}
          </button>
        </div>
      </article>

      {/* Your posts */}
      <section className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            You haven’t shared any projects yet.
          </div>
        ) : (
          items.map((j) => (
            <a
              key={j.id}
              href={`/post/${j.id}`}
              className="block rounded-2xl border bg-white p-4 hover:border-gray-300"
            >
              <div className="font-medium">{j.title || "Untitled"}</div>
              <div className="mt-1 text-sm text-gray-600">
                {j.business_name ? `${j.business_name} • ` : ""}
                {j.suburb}, {j.state} {j.postcode}
              </div>
            </a>
          ))
        )}
      </section>
    </section>
  );
}
