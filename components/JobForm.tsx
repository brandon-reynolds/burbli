// components/JobForm.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import SuburbAutocomplete from "@/components/SuburbAutocomplete";

type Props = {
  initialJob?: Job | null;
  onCreated?: (j: Job) => void;
  onSaved?: (j: Job) => void;
  submitLabel?: string;
};

const MONTHS = [
  { v: "01", n: "Jan" }, { v: "02", n: "Feb" }, { v: "03", n: "Mar" },
  { v: "04", n: "Apr" }, { v: "05", n: "May" }, { v: "06", n: "Jun" },
  { v: "07", n: "Jul" }, { v: "08", n: "Aug" }, { v: "09", n: "Sep" },
  { v: "10", n: "Oct" }, { v: "11", n: "Nov" }, { v: "12", n: "Dec" },
];

function toMonthYear(iso?: string | null) {
  if (!iso) return { m: "", y: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { m: "", y: "" };
  return { m: String(d.getMonth() + 1).padStart(2, "0"), y: String(d.getFullYear()) };
}

export default function JobForm({ initialJob = null, onCreated, onSaved, submitLabel }: Props) {
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [business, setBusiness] = useState(initialJob?.business_name ?? "");

  // Location stored internally (postcode optional, state now optional too)
  const [suburb, setSuburb] = useState(initialJob?.suburb ?? "");
  const [stateA, setStateA] = useState(initialJob?.state ?? "");
  const [postcode, setPostcode] = useState(initialJob?.postcode ? String(initialJob.postcode) : "");

  const [recommend, setRecommend] = useState<boolean>(initialJob?.recommend ?? true);
  const [notes, setNotes] = useState(initialJob?.notes ?? "");

  // Single optional cost field
  const [costApprox, setCostApprox] = useState(
    initialJob?.cost != null && initialJob?.cost_type === "exact" ? String(initialJob.cost) : ""
  );

  // Completed (optional)
  const initMY = toMonthYear(initialJob?.done_at as any);
  const [doneMonth, setDoneMonth] = useState<string>(initMY.m);
  const [doneYear, setDoneYear] = useState<string>(initMY.y);

  const [saving, setSaving] = useState(false);

  const suburbInitialLabel = useMemo(() => {
    const bits = [initialJob?.suburb, initialJob?.state, initialJob?.postcode]
      .filter(Boolean)
      .join(", ");
    return bits || "";
  }, [initialJob?.suburb, initialJob?.state, initialJob?.postcode]);

  // ✅ Only require title, business, suburb (state & postcode optional)
  const disabled = useMemo(() => {
    if (!title.trim() || !business.trim()) return true;
    if (!suburb.trim()) return true;
    return false;
  }, [title, business, suburb]);

  function buildDoneAt(month: string, year: string): string | null {
    if (!month || !year) return null;
    const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, 15, 12, 0, 0));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || disabled) return;
    setSaving(true);

    const trimmedCost = costApprox.replace(/[^\d]/g, "").trim();
    const costNumber = trimmedCost ? parseInt(trimmedCost, 10) : null;

    const base: any = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      // ✅ allow null state if not provided
      state: stateA.trim() || null,
      // ✅ store postcode if valid; else null
      postcode: /^\d{4}$/.test(postcode) ? parseInt(postcode, 10) : null,
      recommend,
      notes: notes.trim() || null,
      cost_type: costNumber != null ? "exact" : "na",
      cost: costNumber,
      cost_min: null,
      cost_max: null,
      done_at: buildDoneAt(doneMonth, doneYear),
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
        setTitle(""); setBusiness("");
        setSuburb(""); setStateA(""); setPostcode("");
        setRecommend(true); setNotes("");
        setCostApprox("");
        setDoneMonth(""); setDoneYear("");
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

      {/* Title */}
      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          placeholder="e.g. Replace garage door motor"
        />
      </div>

      {/* Business */}
      <div>
        <label className="block text-sm font-medium">Who did it *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={business}
          onChange={(e)=>setBusiness(e.target.value)}
          placeholder="Business name"
        />
      </div>

      {/* Location via Mapbox autocomplete */}
      <div>
        <label className="block text-sm font-medium">Suburb *</label>
        <SuburbAutocomplete
          label={suburbInitialLabel || [suburb, stateA, postcode].filter(Boolean).join(", ")}
          placeholder="Start typing a suburb…"
          onPick={(p) => {
            setSuburb(p.suburb ?? "");
            setStateA(p.state ?? "");
            setPostcode(p.postcode ?? "");
          }}
          onBlurAutoFillEmpty
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">We’ll fill state and postcode for you (if available).</p>
      </div>

      {/* Recommendation */}
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

      {/* Cost (optional) */}
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
      </div>

      {/* Completed (optional) */}
      <div>
        <label className="block text-sm font-medium">Completed (optional)</label>
        <div className="mt-1 grid grid-cols-2 gap-3 max-w-xs">
          <select
            className="rounded-xl border px-3 py-2"
            value={doneMonth}
            onChange={(e)=>setDoneMonth(e.target.value)}
          >
            <option value="">Month</option>
            {MONTHS.map(m=>(
              <option key={m.v} value={m.v}>{m.n}</option>
            ))}
          </select>
          <select
            className="rounded-xl border px-3 py-2"
            value={doneYear}
            onChange={(e)=>setDoneYear(e.target.value.replace(/[^\d]/g,""))}
          >
            <option value="">Year</option>
            {Array.from({length: 12}).map((_,i)=>{
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Details */}
      <div>
        <label className="block text-sm font-medium">Details (optional)</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={5}
          value={notes}
          onChange={(e)=>setNotes(e.target.value)}
        />
      </div>

      {/* Submit */}
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