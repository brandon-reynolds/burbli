// components/JobForm.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  initialJob?: Job | null;
  onCreated?: (j: Job) => void;
  onSaved?: (j: Job) => void;
  submitLabel?: string;
};

type CostType = "exact" | "range" | "from" | "na";

function toMoneyInt(s: string): number | null {
  const cleaned = (s ?? "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export default function JobForm({ initialJob = null, onCreated, onSaved, submitLabel }: Props) {
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [business, setBusiness] = useState(initialJob?.business_name ?? "");
  const [suburb, setSuburb] = useState(initialJob?.suburb ?? "");
  const [stateA, setStateA] = useState(initialJob?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initialJob?.postcode ? String(initialJob.postcode) : "");
  const [recommend, setRecommend] = useState<boolean>(initialJob?.recommend ?? true);
  const [notes, setNotes] = useState(initialJob?.notes ?? "");

  // NEW: support "from"
  const [costType, setCostType] = useState<CostType>((initialJob?.cost_type as CostType) ?? "na");
  const [cost, setCost] = useState(initialJob?.cost != null ? String(initialJob.cost) : "");
  const [costMin, setCostMin] = useState(initialJob?.cost_min != null ? String(initialJob.cost_min) : "");
  const [costMax, setCostMax] = useState(initialJob?.cost_max != null ? String(initialJob.cost_max) : "");
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ignore) setOwnerId(user?.id ?? null);
    })();
    return () => { ignore = true; };
  }, []);

  // Reset irrelevant fields when switching type (prevents stale values being saved)
  useEffect(() => {
    if (costType === "exact") {
      setCostMin("");
      setCostMax("");
    } else if (costType === "range") {
      setCost("");
    } else if (costType === "from") {
      setCostMin("");
      setCostMax("");
    }
  }, [costType]);

  const disabled = useMemo(() => {
    if (!title.trim() || !business.trim() || !suburb.trim() || !/^\d{4}$/.test(postcode)) return true;

    if (costType === "exact") {
      return !toMoneyInt(cost);
    }
    if (costType === "range") {
      const min = toMoneyInt(costMin);
      const max = toMoneyInt(costMax);
      // allow partial range, but require at least one side
      if (min == null && max == null) return true;
      if (min != null && max != null && min > max) return true;
      return false;
    }
    if (costType === "from") {
      // accept value typed in "cost" (preferred)
      // if user typed in min out of habit, we’ll read that too
      const v = toMoneyInt(cost) ?? toMoneyInt(costMin);
      return v == null;
    }
    // "na"
    return false;
  }, [title, business, suburb, postcode, costType, cost, costMin, costMax]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || disabled) return;
    setSaving(true);

    // Build payload with correct numeric/null fields
    let payload: any = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      state: stateA.trim(),
      postcode: postcode ? parseInt(postcode, 10) : null,
      recommend,
      notes: notes.trim() || null,
      cost_type: null as Job["cost_type"] | null,
      cost: null as number | null,
      cost_min: null as number | null,
      cost_max: null as number | null,
    };

    if (costType === "exact") {
      payload.cost_type = "exact";
      payload.cost = toMoneyInt(cost);
    } else if (costType === "range") {
      payload.cost_type = "range";
      payload.cost_min = toMoneyInt(costMin);
      payload.cost_max = toMoneyInt(costMax);
    } else if (costType === "from") {
      payload.cost_type = "from";
      // prefer main cost field; if empty but min has a value, use that
      payload.cost = toMoneyInt(cost) ?? toMoneyInt(costMin);
    } else {
      // na / prefer not to say
      payload.cost_type = null;
      payload.cost = toMoneyInt(cost) ?? null;
      payload.cost_min = toMoneyInt(costMin) ?? null;
      payload.cost_max = toMoneyInt(costMax) ?? null;
    }

    try {
      let res;
      if (initialJob?.id) {
        res = await supabase.from("jobs").update(payload).eq("id", initialJob.id).select("*").single();
        if (res.error) throw res.error;
        onSaved?.(res.data as Job);
      } else {
        const owner_id = ownerId ?? (await supabase.auth.getUser()).data.user?.id ?? null;
        res = await supabase.from("jobs").insert({ ...payload, owner_id }).select("*").single();
        if (res.error) throw res.error;
        onCreated?.(res.data as Job);
        onSaved?.(res.data as Job);
        // reset form
        setTitle(""); setBusiness(""); setSuburb(""); setStateA("VIC"); setPostcode("");
        setRecommend(true); setNotes("");
        setCostType("na"); setCost(""); setCostMin(""); setCostMax("");
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
        <input className="mt-1 w-full rounded-xl border px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Who did it *</label>
        <input className="mt-1 w-full rounded-xl border px-3 py-2" value={business} onChange={(e)=>setBusiness(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Suburb *</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={suburb} onChange={(e)=>setSuburb(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">State *</label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2" value={stateA} onChange={(e)=>setStateA(e.target.value)}>
            {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Postcode *</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={postcode} onChange={(e)=>setPostcode(e.target.value.replace(/\D/g,"").slice(0,4))} />
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

      <div>
        <label className="block text-sm font-medium">Cost</label>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType==="exact"} onChange={()=>setCostType("exact")} /> Exact
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType==="range"} onChange={()=>setCostType("range")} /> Range
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType==="from"} onChange={()=>setCostType("from")} /> From
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType==="na"} onChange={()=>setCostType("na")} /> Prefer not to say
          </label>
        </div>

        {costType==="exact" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={cost}
              onChange={(e)=>setCost(e.target.value.replace(/[^\d]/g,""))}
              placeholder="3500"
              inputMode="numeric"
            />
          </div>
        )}

        {costType==="from" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={cost}
              onChange={(e)=>setCost(e.target.value.replace(/[^\d]/g,""))}
              placeholder="Starting price e.g. 500"
              inputMode="numeric"
            />
          </div>
        )}

        {costType==="range" && (
          <div className="mt-2 flex max-w-md items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-32 rounded-xl border px-3 py-2"
                value={costMin}
                onChange={(e)=>setCostMin(e.target.value.replace(/[^\d]/g,""))}
                placeholder="min"
                inputMode="numeric"
              />
            </div>
            <span className="text-gray-500">–</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="w-32 rounded-xl border px-3 py-2"
                value={costMax}
                onChange={(e)=>setCostMax(e.target.value.replace(/[^\d]/g,""))}
                placeholder="max"
                inputMode="numeric"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Details (optional)</label>
        <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={5} value={notes} onChange={(e)=>setNotes(e.target.value)} />
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
