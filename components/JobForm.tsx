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

function isoToMonthValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // <input type="month"> value
}

export default function JobForm({ initialJob = null, onCreated, onSaved, submitLabel }: Props) {
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [business, setBusiness] = useState(initialJob?.business_name ?? "");
  const [suburb, setSuburb] = useState(initialJob?.suburb ?? "");
  const [stateA, setStateA] = useState(initialJob?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initialJob?.postcode ? String(initialJob.postcode) : "");
  const [recommend, setRecommend] = useState<boolean>(initialJob?.recommend ?? true);
  const [notes, setNotes] = useState(initialJob?.notes ?? "");

  // NEW: month/year only
  const [doneAtMonth, setDoneAtMonth] = useState<string>(isoToMonthValue(initialJob?.done_at));

  const [costType, setCostType] = useState<"exact"|"range"|"na">(initialJob?.cost_type ?? "na");
  const [cost, setCost] = useState(initialJob?.cost ? String(initialJob.cost) : "");
  const [costMin, setCostMin] = useState(initialJob?.cost_min ? String(initialJob.cost_min) : "");
  const [costMax, setCostMax] = useState(initialJob?.cost_max ? String(initialJob.cost_max) : "");
  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => {
    if (!title.trim() || !business.trim() || !suburb.trim() || !/^\d{4}$/.test(postcode)) return true;
    if (costType === "exact" && !cost.trim()) return true;
    if (costType === "range" && (!costMin.trim() || !costMax.trim())) return true;
    return false;
  }, [title, business, suburb, postcode, costType, cost, costMin, costMax]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || disabled) return;
    setSaving(true);

    const base: any = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      state: stateA.trim(),
      postcode: postcode ? parseInt(postcode, 10) : null,
      recommend,
      notes: notes.trim() || null,
      cost_type: costType,
      cost: null,
      cost_min: null,
      cost_max: null,
      // store first day of month for DATE column
      done_at: doneAtMonth ? `${doneAtMonth}-01` : null,
    };
    if (costType === "exact") base.cost = cost.trim();
    if (costType === "range") {
      base.cost_min = costMin.trim();
      base.cost_max = costMax.trim();
    }

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
        setTitle(""); setBusiness(""); setSuburb(""); setStateA("VIC"); setPostcode("");
        setRecommend(true); setNotes(""); setCostType("na"); setCost(""); setCostMin(""); setCostMax("");
        setDoneAtMonth("");
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

      {/* NEW: month/year only */}
      <div>
        <label className="block text-sm font-medium">When was the job done? <span className="text-gray-400">(optional)</span></label>
        <input
          type="month"
          className="mt-1 w-full max-w-xs rounded-xl border px-3 py-2"
          value={doneAtMonth}
          onChange={(e)=>setDoneAtMonth(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">Month and year only (approximate is fine).</p>
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
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={costType==="exact"} onChange={()=>setCostType("exact")} /> Exact</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={costType==="range"} onChange={()=>setCostType("range")} /> Range</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={costType==="na"} onChange={()=>setCostType("na")} /> Prefer not to say</label>
        </div>

        {costType==="exact" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <span className="text-gray-500">$</span>
            <input className="w-full rounded-xl border px-3 py-2" value={cost} onChange={(e)=>setCost(e.target.value.replace(/[^\d]/g,""))} placeholder="3500" inputMode="numeric"/>
          </div>
        )}

        {costType==="range" && (
          <div className="mt-2 flex max-w-md items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input className="w-32 rounded-xl border px-3 py-2" value={costMin} onChange={(e)=>setCostMin(e.target.value.replace(/[^\d]/g,""))} placeholder="min" inputMode="numeric"/>
            </div>
            <span className="text-gray-500">–</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input className="w-32 rounded-xl border px-3 py-2" value={costMax} onChange={(e)=>setCostMax(e.target.value.replace(/[^\d]/g,""))} placeholder="max" inputMode="numeric"/>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Details (optional)</label>
        <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={5} value={notes} onChange={(e)=>setNotes(e.target.value)} />
      </div>

      <div className="pt-2">
        <button type="submit" disabled={saving || disabled} className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60">
          {saving ? "Saving…" : (submitLabel ?? (initialJob ? "Save changes" : "Post job"))}
        </button>
      </div>
    </form>
  );
}
