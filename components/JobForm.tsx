// components/JobForm.tsx
"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  initialJob?: Job | null;
  onCreated?: (j: Job) => void;
  onSaved?: (j: Job) => void;
  submitLabel?: string;
};

export default function JobForm({ initialJob = null, onCreated, onSaved, submitLabel }: Props) {
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [business, setBusiness] = useState(initialJob?.business_name ?? "");
  const [suburb, setSuburb] = useState(initialJob?.suburb ?? "");
  const [stateA, setStateA] = useState(initialJob?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initialJob?.postcode ? String(initialJob.postcode) : "");
  const [recommend, setRecommend] = useState<boolean>(initialJob?.recommend ?? true);
  const [notes, setNotes] = useState(initialJob?.notes ?? "");

  // ✅ Single optional cost field (approximate)
  const [costApprox, setCostApprox] = useState(
    initialJob?.cost != null && initialJob?.cost_type === "exact" ? String(initialJob.cost) : ""
  );

  // If you already store done_at, keep your existing fields/logic.
  // (No changes made here to avoid breaking elsewhere.)

  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => {
    // Cost is optional now, so we only validate core required fields
    return (
      !title.trim() ||
      !business.trim() ||
      !suburb.trim() ||
      !/^\d{4}$/.test(postcode)
    );
  }, [title, business, suburb, postcode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || disabled) return;
    setSaving(true);

    // Build base object; cost_* normalized from single optional input
    const trimmedCost = costApprox.replace(/[^\d]/g, "").trim();
    const costNumber = trimmedCost ? parseInt(trimmedCost, 10) : null;

    const base: any = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      state: stateA.trim(),
      postcode: postcode ? parseInt(postcode, 10) : null,
      recommend,
      notes: notes.trim() || null,
      // cost normalization
      cost_type: costNumber != null ? "exact" : "na",
      cost: costNumber,
      cost_min: null,
      cost_max: null,
    };

    try {
      let res;
      if (initialJob?.id) {
        res = await supabase.from("jobs").update(base).eq("id", initialJob.id).select("*").single();
        if (res.error) throw res.error;
        onSaved?.(res.data as Job);
      } else {
        const { data: auth } = await supabase.auth.getUser();
        base.owner_id = auth?.user?.id ?? null;
        res = await supabase.from("jobs").insert(base).select("*").single();
        if (res.error) throw res.error;
        onCreated?.(res.data as Job);
        onSaved?.(res.data as Job);

        // Reset form
        setTitle(""); setBusiness(""); setSuburb(""); setStateA("VIC"); setPostcode("");
        setRecommend(true); setNotes(""); setCostApprox("");
      }
    } catch (err: any) {
      alert(err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-4 md:p-6 space-y-4">
      <h2 className="text-xl font-semibold">{initialJob ? "Edit project" : "Share a project"}</h2>

      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Who did it *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={business}
          onChange={(e)=>setBusiness(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Suburb *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={suburb}
            onChange={(e)=>setSuburb(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">State *</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={stateA}
            onChange={(e)=>setStateA(e.target.value)}
          >
            {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Postcode *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={postcode}
            onChange={(e)=>setPostcode(e.target.value.replace(/\D/g,"").slice(0,4))}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Recommendation</label>
        <div className="mt-1 flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={recommend===true} onChange={()=>setRecommend(true)} /> Recommend
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={recommend===false} onChange={()=>setRecommend(false)} /> Not recommend
          </label>
        </div>
      </div>

      {/* ✅ Single optional cost */}
      <div>
        <label className="block text-sm font-medium">Approximate cost (optional)</label>
        <div className="mt-1 flex max-w-xs items-center gap-2">
          <span className="text-gray-500">$</span>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={costApprox}
            onChange={(e)=>setCostApprox(e.target.value.replace(/[^\d]/g,""))}
            placeholder="e.g. 3500"
            inputMode="numeric"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">If you don’t remember exactly, a rough amount is fine — or leave blank.</p>
      </div>

      <div>
        <label className="block text-sm font-medium">Details (optional)</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={5}
          value={notes}
          onChange={(e)=>setNotes(e.target.value)}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving || disabled}
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving…" : (submitLabel ?? (initialJob ? "Save changes" : "Post job"))}
        </button>
      </div>
    </form>
  );
}
