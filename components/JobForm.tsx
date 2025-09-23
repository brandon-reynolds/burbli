// components/JobForm.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types"; // if you don't have /types, change `Job` to `any`

const STATES = ["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;

const isPostcode = (v:string) => /^\d{4}$/.test(v.trim());
const toCents = (v:string) => Math.round((parseFloat(v.replace(/[^\d.]/g, "")) || 0) * 100);

export default function JobForm({ onCreated }:{ onCreated:(j:Job)=>void }) {
  const [title,setTitle] = useState("");
  const [biz,setBiz] = useState("");
  const [suburb,setSuburb] = useState("");
  const [state,setState] = useState<string>("");
  const [postcode,setPostcode] = useState("");

  const [costType,setCostType] = useState<"exact"|"range"|"hidden">("exact");
  const [costExact,setCostExact] = useState("");
  const [costMin,setCostMin] = useState("");
  const [costMax,setCostMax] = useState("");

  const [rec,setRec] = useState<"yes"|"no">("yes");
  const [notes,setNotes] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return alert("Add a title");
    if (!biz.trim()) return alert("Add who did it");
    if (!suburb.trim()) return alert("Add a suburb");
    if (!state) return alert("Pick a state");
    if (!isPostcode(postcode)) return alert("Enter a valid 4-digit postcode");

    if (costType === "exact" && costExact && isNaN(Number(costExact.replace(/[^\d.]/g, "")))) {
      return alert("Exact cost must be a number");
    }
    if (costType === "range") {
      const min = Number(costMin.replace(/[^\d.]/g, "")); const max = Number(costMax.replace(/[^\d.]/g, ""));
      if (isNaN(min) || isNaN(max)) return alert("Range must be numbers");
      if (min > max) return alert("Min cannot be greater than Max");
    }

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return alert("Please sign in first"); }

    const payload:any = {
      owner_id: user.id,
      title: title.trim(),
      business_name: biz.trim(),
      suburb: suburb.trim(),
      state,
      postcode: postcode.trim(),
      recommend: rec === "yes",
      cost_type: costType,
      notes: notes.trim() || null,
    };
    if (costType === "exact" && costExact) payload.cost_amount = toCents(costExact);
    if (costType === "range") { payload.cost_min = toCents(costMin); payload.cost_max = toCents(costMax); }

    const { data, error } = await supabase.from("jobs").insert(payload).select().single();
    setBusy(false);
    if (error) return alert(error.message);

    onCreated(data as Job);

    setTitle(""); setBiz("");
    setSuburb(""); setState(""); setPostcode("");
    setCostType("exact"); setCostExact(""); setCostMin(""); setCostMax("");
    setRec("yes"); setNotes("");
  }

  return (
    <div className="rounded-3xl border p-6 bg-white">
      <h2 className="text-xl font-semibold">Post job</h2>
      <p className="mt-1 text-sm text-gray-600">
        Costs are optional. We always show suburb, state and postcode.
      </p>

      {/* Job details */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-700">Job details</h3>
      <div className="grid gap-3">
        <input className="border rounded-xl px-3 py-2" placeholder="Title (e.g. Roof insulation replacement)" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Who did it (business or tradie name)" value={biz} onChange={e=>setBiz(e.target.value)} />
      </div>

      {/* Location */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-700">Location</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <input className="border rounded-xl px-3 py-2" placeholder="Suburb" value={suburb} onChange={e=>setSuburb(e.target.value)} autoComplete="address-level2" />
        <select className="border rounded-xl px-3 py-2" value={state} onChange={e=>setState(e.target.value)}>
          <option value="">State</option>
          {STATES.map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="border rounded-xl px-3 py-2" placeholder="Postcode" value={postcode} onChange={e=>setPostcode(e.target.value)} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="postal-code" />
      </div>

      {/* Cost (optional) */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-700">Cost (optional)</h3>
      <div className="text-sm">
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="exact"} onChange={()=>setCostType("exact")} /> Exact</label>
          <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="range"} onChange={()=>setCostType("range")} /> Range</label>
          <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="hidden"} onChange={()=>setCostType("hidden")} /> Prefer not to say</label>
        </div>

        {costType==="exact" && (
          <div className="mt-3 flex items-center gap-2">
            <span>$</span>
            <input className="border rounded-xl px-3 py-2 w-40" placeholder="3899.99" value={costExact} onChange={e=>setCostExact(e.target.value)} inputMode="decimal" />
          </div>
        )}

        {costType==="range" && (
          <div className="mt-3 flex items-center gap-2">
            <span>$</span>
            <input className="border rounded-xl px-3 py-2 w-36" placeholder="Min (e.g. 180)" value={costMin} onChange={e=>setCostMin(e.target.value)} inputMode="decimal" />
            <span>to</span>
            <span>$</span>
            <input className="border rounded-xl px-3 py-2 w-36" placeholder="Max (e.g. 320)" value={costMax} onChange={e=>setCostMax(e.target.value)} inputMode="decimal" />
          </div>
        )}
      </div>

      {/* Recommendation */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-700">Would you recommend them?</h3>
      <div className="flex gap-6 text-sm">
        <label className="inline-flex items-center gap-2"><input type="radio" checked={rec==="yes"} onChange={()=>setRec("yes")}/> Yes</label>
        <label className="inline-flex items-center gap-2"><input type="radio" checked={rec==="no"} onChange={()=>setRec("no")}/> No</label>
      </div>

      {/* Notes */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-700">Notes (optional)</h3>
      <textarea className="border rounded-xl px-3 py-2 w-full" rows={3} placeholder="Keep it short & helpful" value={notes} onChange={e=>setNotes(e.target.value)} />

      <div className="mt-4 flex items-center justify-end">
        <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-xl bg-gray-900 text-white">
          {busy ? "Posting…" : "Post job"}
        </button>
      </div>
    </div>
  );
}
