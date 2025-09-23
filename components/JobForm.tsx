"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Mode = "create" | "update";

type Props = {
  mode?: Mode;
  initial?: Job | null;
  onCreated?: (j: Job) => void;  // kept for backward compatibility
  onSaved?: (j: Job) => void;
};

type Draft = {
  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: string; // keep as string in form; coerce at save
  recommend: boolean;
  notes: string;

  // cost fields (form state)
  costType: "exact" | "range" | "na";
  costExact: string;   // "$3500" or "3500" – we store as string
  costMin: string;     // for range
  costMax: string;     // for range
};

function toDraft(j?: Job | null): Draft {
  return {
    title: j?.title ?? "",
    business_name: j?.business_name ?? "",
    suburb: j?.suburb ?? "",
    state: j?.state ?? "VIC",
    postcode: j?.postcode ? String(j.postcode) : "",
    recommend: j?.recommend ?? true,
    notes: j?.notes ?? "",

    costType:
      j?.cost_type === "exact" || j?.cost_type === "range"
        ? (j.cost_type as "exact" | "range")
        : "na",
    costExact:
      j?.cost_type === "exact" && j?.cost ? String(j.cost) : "",
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
  }, [initial?.id]); // re-hydrate when switching record

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

    if (draft.costType === "exact") {
      return !draft.costExact.trim();
    }
    if (draft.costType === "range") {
      return !draft.costMin.trim() || !draft.costMax.trim();
    }
    return false;
  }, [draft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || saving) return;

    setSaving(true);
    try {
      // current user (for insert and for RLS match on update)
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      // build base payload; DO NOT include undefined/empty optional fields
      const base: any = {
        title: draft.title.trim(),
        business_name: draft.business_name.trim(),
        suburb: draft.suburb.trim(),
        state: draft.state.trim(),
        postcode: draft.postcode ? parseInt(draft.postcode, 10) : null, // let it be null if empty
        recommend: !!draft.recommend,
        notes: draft.notes.trim() || null,
      };

      // cost fields
      if (draft.costType === "exact") {
        base.cost_type = "exact";
        // keep original number/string – DB column is text in this app
        base.cost = draft.costExact.trim();
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

        // UPDATE — IMPORTANT: scope by id AND owner_id so RLS passes
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
        // INSERT — attach owner_id
        const payload = { ...base, owner_id: userId };
        const { data, error } = await supabase
          .from("jobs")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        result = data as Job;
        onCreated?.(result);
        onSaved?.(result);
        // reset form after create
        setDraft(toDraft(null));
      }
    } catch (err: any) {
      alert(`Could not save changes.\n\n${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          className="w-full rounded-xl border p-3"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Toilet replacement"
        />
      </div>

      {/* Business */}
      <div>
        <label className="block text-sm font-medium mb-1">Who did it (business or tradie name)</label>
        <input
          className="w-full rounded-xl border p-3"
          value={draft.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="Adrian – Airtasker"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Suburb</label>
          <input
            className="w-full rounded-xl border p-3"
            value={draft.suburb}
            onChange={(e) => set("suburb", e.target.value)}
            placeholder="Epping"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <select
            className="w-full rounded-xl border p-3"
            value={draft.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postcode</label>
          <input
            className="w-full rounded-xl border p-3"
            value={draft.postcode}
            onChange={(e) => set("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="3076"
            inputMode="numeric"
            maxLength={4}
          />
        </div>
      </div>

      {/* Recommend */}
      <div>
        <label className="block text-sm font-medium mb-1">Recommendation</label>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="recommend"
              checked={draft.recommend === true}
              onChange={() => set("recommend", true)}
            />
            Recommend
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="recommend"
              checked={draft.recommend === false}
              onChange={() => set("recommend", false)}
            />
            Not recommend
          </label>
        </div>
      </div>

      {/* Cost */}
      <div>
        <label className="block text-sm font-medium mb-1">Cost</label>
        <div className="flex items-center gap-6 mb-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="costType"
              checked={draft.costType === "exact"}
              onChange={() => set("costType", "exact")}
            />
            Exact
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="costType"
              checked={draft.costType === "range"}
              onChange={() => set("costType", "range")}
            />
            Range
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="costType"
              checked={draft.costType === "na"}
              onChange={() => set("costType", "na")}
            />
            Prefer not to say
          </label>
        </div>

        {draft.costType === "exact" && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              className="flex-1 rounded-xl border p-3"
              value={draft.costExact}
              onChange={(e) => set("costExact", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="3500"
              inputMode="numeric"
            />
          </div>
        )}

        {draft.costType === "range" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-full rounded-xl border p-3"
                value={draft.costMin}
                onChange={(e) => set("costMin", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="100"
                inputMode="numeric"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-full rounded-xl border p-3"
                value={draft.costMax}
                onChange={(e) => set("costMax", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="150"
                inputMode="numeric"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Details (optional)</label>
        <textarea
          className="w-full rounded-xl border p-3 min-h-[120px]"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything others should know?"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || disabled}
          className={`rounded-xl px-4 py-2 text-white ${saving || disabled ? "bg-gray-400" : "bg-gray-900"}`}
        >
          {isUpdate ? (saving ? "Saving…" : "Save changes") : (saving ? "Posting…" : "Post job")}
        </button>
        {saving && <span className="text-sm text-gray-500">Saving…</span>}
      </div>
    </form>
  );
}
