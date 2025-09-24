// components/JobForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Mode = "create" | "update";

type Props = {
  mode?: Mode;
  initial?: Job | null;
  onCreated?: (j: Job) => void;
  onSaved?: (j: Job) => void;
};

type Draft = {
  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: string;
  recommend: boolean;
  notes: string;

  costType: "exact" | "range" | "na";
  cost: string;     // for exact
  costMin: string;  // for range
  costMax: string;  // for range
};

function toDraft(j?: Job | null): Draft {
  return {
    title: j?.title ?? "",
    business_name: j?.business_name ?? "",
    suburb: j?.suburb ?? "",
    state: j?.state ?? "VIC",
    postcode: j?.postcode != null ? String(j.postcode) : "",
    recommend: j?.recommend ?? true,
    notes: j?.notes ?? "",

    costType:
      j?.cost_type === "exact" || j?.cost_type === "range"
        ? (j.cost_type as "exact" | "range")
        : "na",
    cost: j?.cost_type === "exact" && j?.cost ? String(j.cost) : "",
    costMin: j?.cost_type === "range" && j?.cost_min ? String(j.cost_min) : "",
    costMax: j?.cost_type === "range" && j?.cost_max ? String(j.cost_max) : "",
  };
}

export default function JobForm({ mode = "create", initial = null, onCreated, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const isUpdate = mode === "update" && !!initial?.id;

  useEffect(() => {
    setDraft(toDraft(initial));
  }, [initial?.id]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const disabled = useMemo(() => {
    const required =
      draft.title.trim() &&
      draft.business_name.trim() &&
      draft.suburb.trim() &&
      draft.state.trim() &&
      /^\d{4}$/.test(draft.postcode);
    if (!required) return true;

    if (draft.costType === "exact") return !draft.cost.trim();
    if (draft.costType === "range") return !draft.costMin.trim() || !draft.costMax.trim();
    return false;
  }, [draft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || disabled) return;

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const base: any = {
        title: draft.title.trim(),
        business_name: draft.business_name.trim(),
        suburb: draft.suburb.trim(),
        state: draft.state.trim(),
        postcode: draft.postcode ? parseInt(draft.postcode, 10) : null,
        recommend: !!draft.recommend,
        notes: draft.notes.trim() || null,
      };

      if (draft.costType === "exact") {
        base.cost_type = "exact";
        base.cost = draft.cost.trim();
        base.cost_min = null;
        base.cost_max = null;
      } else if (draft.costType === "range") {
        base.cost_type = "range";
        base.cost = null;
        base.cost_min = draft.costMin.trim();
        base.cost_max = draft.costMax.trim();
      } else {
        base.cost_type = "na";
        base.cost = null;
        base.cost_min = null;
        base.cost_max = null;
      }

      let result: Job | null = null;

      if (isUpdate) {
        if (!userId) throw new Error("Not signed in.");
        const { data, error } = await supabase
          .from("jobs")
          .update(base)
          .eq("id", (initial as Job).id)
          .eq("owner_id", userId)
          .select("*")
          .single();

        if (error) throw error;
        result = data as Job;
        onSaved?.(result);
      } else {
        const payload = { ...base, owner_id: userId };
        const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();
        if (error) throw error;
        result = data as Job;
        onCreated?.(result);
        onSaved?.(result);
        setDraft(toDraft(null));
      }
    } catch (err: any) {
      alert(`Could not save changes.\n\n${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-4 md:p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Toilet replacement"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Who did it (business or tradie name)</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={draft.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="Company or tradie"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Suburb</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={draft.suburb}
            onChange={(e) => set("suburb", e.target.value)}
            placeholder="Epping"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">State</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={draft.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Postcode</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={draft.postcode}
            onChange={(e) => set("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="3076"
            inputMode="numeric"
            maxLength={4}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Recommendation</label>
        <div className="mt-1 flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.recommend === true} onChange={() => set("recommend", true)} />
            Recommend
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.recommend === false} onChange={() => set("recommend", false)} />
            Not recommend
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Cost</label>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.costType === "exact"} onChange={() => set("costType", "exact")} />
            Exact
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.costType === "range"} onChange={() => set("costType", "range")} />
            Range
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.costType === "na"} onChange={() => set("costType", "na")} />
            Prefer not to say
          </label>
        </div>

        {draft.costType === "exact" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={draft.cost}
              onChange={(e) => set("cost", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="3500"
              inputMode="numeric"
            />
          </div>
        )}

        {draft.costType === "range" && (
          <div className="mt-2 flex max-w-md items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-32 rounded-xl border px-3 py-2"
                value={draft.costMin}
                onChange={(e) => set("costMin", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="min"
                inputMode="numeric"
              />
            </div>
            <span className="text-gray-500">–</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-32 rounded-xl border px-3 py-2"
                value={draft.costMax}
                onChange={(e) => set("costMax", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="max"
                inputMode="numeric"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Details (optional)</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={5}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any extra context that would help neighbours."
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving || disabled}
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving…" : isUpdate ? "Save changes" : "Post job"}
        </button>
      </div>
    </form>
  );
}
