// components/JobForm.tsx
"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  initialJob?: Job | null;
  onSaved?: (j: Job) => void;
  submitLabel?: string;
};

export default function JobForm({ initialJob = null, onSaved, submitLabel }: Props) {
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [business, setBusiness] = useState(initialJob?.business_name ?? "");
  const [suburb, setSuburb] = useState(initialJob?.suburb ?? "");
  const [stateA, setStateA] = useState(initialJob?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initialJob?.postcode ?? "");
  const [recommend, setRecommend] = useState<boolean>(initialJob?.recommend ?? true);
  const [costMode, setCostMode] = useState<"exact"|"range"|"na">(
    initialJob?.cost_type ?? "na"
  );
  const [costExact, setCostExact] = useState<string>(
    initialJob?.cost_type === "exact" && initialJob?.cost_exact != null
      ? String(initialJob.cost_exact)
      : ""
  );
  const [costMin, setCostMin] = useState<string>(
    initialJob?.cost_type === "range" && initialJob?.cost_min != null
      ? String(initialJob.cost_min)
      : ""
  );
  const [costMax, setCostMax] = useState<string>(
    initialJob?.cost_type === "range" && initialJob?.cost_max != null
      ? String(initialJob.cost_max)
      : ""
  );
  const [notes, setNotes] = useState(initialJob?.notes ?? "");

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!business.trim()) return false;
    if (!suburb.trim()) return false;
    if (!/^\d{4}$/.test(postcode)) return false;

    if (costMode === "exact" && !Number(costExact)) return false;
    if (costMode === "range" && (!Number(costMin) || !Number(costMax))) return false;

    return true;
  }, [title, business, suburb, postcode, costMode, costExact, costMin, costMax]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);

    // build payload with correct cost columns
    const payload: Partial<Job> = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      state: stateA,
      postcode: postcode.trim(),
      recommend,
      notes: notes.trim() || null,
      cost_type: costMode,
      // set all three cost columns explicitly to avoid residue
      cost_exact: null,
      cost_min: null,
      cost_max: null,
    };

    if (costMode === "exact") {
      payload.cost_exact = Math.round(Number(costExact));
    } else if (costMode === "range") {
      payload.cost_min = Math.round(Number(costMin));
      payload.cost_max = Math.round(Number(costMax));
    }

    try {
      // attach owner on create
      if (!initialJob) {
        const { data: userRes } = await supabase.auth.getUser();
        const ownerId = userRes?.user?.id ?? null;
        (payload as any).owner_id = ownerId;

        const { data, error } = await supabase
          .from("jobs")
          .insert(payload)
          .select("*")
          .single();

        if (error || !data) throw error || new Error("Insert failed");
        onSaved?.(data as Job);
      } else {
        // edit
        const { data, error } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", initialJob.id)
          .select("*")
          .single();

        if (error || !data) throw error || new Error("Update failed");
        onSaved?.(data as Job);
      }
    } catch (err: any) {
      alert(err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Roof insulation replacement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Who did it (business or tradie name)</label>
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Company / Tradie name"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Suburb</label>
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Epping"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <select
            className="w-full rounded-xl border p-3"
            value={stateA}
            onChange={(e) => setStateA(e.target.value)}
          >
            {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map(s=>(
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postcode</label>
          <input
            className="w-full rounded-xl border p-3"
            placeholder="3076"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Recommendation</label>
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={recommend} onChange={()=>setRecommend(true)} /> Recommend
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!recommend} onChange={()=>setRecommend(false)} /> Not recommend
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cost</label>
        <div className="flex items-center gap-6 text-sm mb-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={costMode==="exact"} onChange={()=>setCostMode("exact")} /> Exact
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={costMode==="range"} onChange={()=>setCostMode("range")} /> Range
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={costMode==="na"} onChange={()=>setCostMode("na")} /> Prefer not to say
          </label>
        </div>

        {costMode === "exact" && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              className="w-40 rounded-xl border p-3"
              placeholder="3500"
              inputMode="numeric"
              value={costExact}
              onChange={(e)=>setCostExact(e.target.value)}
            />
          </div>
        )}

        {costMode === "range" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-40 rounded-xl border p-3"
                placeholder="3000"
                inputMode="numeric"
                value={costMin}
                onChange={(e)=>setCostMin(e.target.value)}
              />
            </div>
            <span className="text-gray-500">to</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-40 rounded-xl border p-3"
                placeholder="4000"
                inputMode="numeric"
                value={costMax}
                onChange={(e)=>setCostMax(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Details (optional)</label>
        <textarea
          className="w-full rounded-xl border p-3"
          rows={4}
          placeholder="Any details that help neighbours know what to expect…"
          value={notes}
          onChange={(e)=>setNotes(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || saving}
        className="rounded-xl bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : (submitLabel ?? (initialJob ? "Save changes" : "Post job"))}
      </button>
    </form>
  );
}
