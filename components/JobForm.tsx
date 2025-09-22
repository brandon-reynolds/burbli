"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

const STATES = ["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"] as const;
const pcOk = (s:string) => /^\d{4}$/.test(s.trim());
const toCents = (v:string) => Math.round(parseFloat(v) * 100);

export default function JobForm({ onCreated }:{ onCreated:(j:Job)=>void }) {
  const [title,setTitle] = useState("");
  const [suburb,setSuburb] = useState("");
  const [state,setState] = useState<string>("");
  const [postcode,setPostcode] = useState("");
  const [biz,setBiz] = useState("");
  const [rec,setRec] = useState<"yes"|"no">("yes");
  const [costType,setCostType] = useState<"hidden"|"exact"|"range">("hidden");
  const [costExact,setCostExact] = useState("");
  const [costMin,setCostMin] = useState("");
  const [costMax,setCostMax] = useState("");
  const [notes,setNotes] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return alert("Add a title");
    if (!suburb.trim()) return alert("Add a suburb");
    if (!state) return alert("Pick a state");
    if (!pcOk(postcode)) return alert("Enter a valid 4-digit postcode");
    if (!biz.trim()) return alert("Add who did it");

    setBusy(true);
    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr || !user) { setBusy(false); return alert("Please sign in first"); }

    const payload:any = {
      owner_id: user.id,
      title: title.trim(),
      suburb: suburb.trim(),
      state,
      postcode: postcode.trim(),
      business_name: biz.trim(),
      recommend: rec === "yes",
      cost_type: costType,
      notes: notes.trim() || null,
    };
    if (costType === "exact") payload.cost_amount = toCents(costExact);
    if (costType === "range") { payload.cost_min = toCents(costMin); payload.cost_max = toCents(costMax); }

    const { data, error } = await supabase.from("jobs").insert(payload).select().single();
    setBusy(false);
    if (error) return alert(error.message);

    // success: hand off to parent banner, no alert/pop-up
    onCreated(data as Job);

    // reset inputs
    setTitle(""); setSuburb(""); setState(""); setPostcode("");
    setBiz(""); setRec("yes"); setCostType("hidden");
    setCostExact(""); setCostMin(""); setCostMax(""); setNotes("");
  }

  return (
    <div className="rounded-2xl border p-6 bg-white">
      <h2 className="text-xl font-semibold">Share your job</h2>
      <div className="grid gap-4 mt-4">
        <input className="border rounded-xl px-3 py-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <div className="grid md:grid-cols-3 gap-4">
          <input className="border rounded-xl px-3 py-2" placeholder="Suburb" value={suburb} onChange={e=>setSuburb(e.target.value)}/>
          <select className="border rounded-xl px-3 py-2" value={state} onChange={e=>setState(e.target.value)}>
            <option value="">State</option>
            {STATES.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="border rounded-xl px-3 py-2" placeholder="Postcode" value={postcode} onChange={e=>setPostcode(e.target.value)}/>
        </div>
        <input className="border rounded-xl px-3 py-2" placeholder="Who did it (business or tradie name)" value={biz} onChange={e=>setBiz(e.target.value)}/>
        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2"><input type="radio" checked={rec==="yes"} onChange={()=>setRec("yes")}/> Recommend</label>
          <label className="inline-flex items-center gap-2"><input type="radio" checked={rec==="no"} onChange={()=>setRec("no")}/> Not recommend</label>
        </div>
        <div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="hidden"} onChange={()=>setCostType("hidden")}/> Prefer not to say</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="exact"} onChange={()=>setCostType("exact")}/> Exact</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType==="range"} onChange={()=>setCostType("range")}/> Range</label>
          </div>
          {costType==="exact" && <div className="mt-2 flex items-center gap-2"><span>$</span><input className="border rounded-xl px-3 py-2 w-40" value={costExact} onChange={e=>setCostExact(e.target.value)} placeholder="3899.99"/></div>}
          {costType==="range" && <div className="mt-2 flex items-center gap-2"><span>$</span><input className="border rounded-xl px-3 py-2 w-36" value={costMin} onChange={e=>setCostMin(e.target.value)} placeholder="180"/><span>to</span><span>$</span><input className="border rounded-xl px-3 py-2 w-36" value={costMax} onChange={e=>setCostMax(e.target.value)} placeholder="320"/></div>}
        </div>
        <textarea className="border rounded-xl px-3 py-2" rows={3} placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/>
        <div className="flex justify-end">
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-xl bg-gray-900 text-white">
            {busy ? "Posting…" : "Post job"}
          </button>
        </div>
      </div>
    </div>
  );
}
