"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import SuburbAutocomplete, { type PickedSuburb } from "@/components/SuburbAutocomplete";

const toCents = (v: string) => Math.round(parseFloat(v) * 100);

export default function JobForm({ onCreated }: { onCreated: (j: Job) => void }) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<PickedSuburb | null>(null);
  const [biz, setBiz] = useState("");
  const [rec, setRec] = useState<"yes" | "no">("yes");
  const [costType, setCostType] = useState<"hidden" | "exact" | "range">("hidden");
  const [costExact, setCostExact] = useState("");
  const [costMin, setCostMin] = useState("");
  const [costMax, setCostMax] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return alert("Add a title");
    if (!picked) return alert("Pick a real suburb from the list");
    if (!biz.trim()) return alert("Add who did it");

    setBusy(true);
    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr || !user) { setBusy(false); return alert("Please sign in first"); }

    const payload: any = {
      owner_id: user.id,
      title: title.trim(),
      suburb: picked.suburb,
      state: picked.state,
      postcode: picked.postcode,
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
    onCreated(data as Job);

    setTitle(""); setPicked(null);
    setBiz(""); setRec("yes"); setCostType("hidden");
    setCostExact(""); setCostMin(""); setCostMax(""); setNotes("");
    alert("Thanks for sharing! Your job has been posted.");
  }

  const selectedPreview = picked ? `${picked.suburb}, ${picked.state} ${picked.postcode}` : "—";

  return (
    <div className="rounded-2xl border p-6 bg-white">
      <h2 className="text-xl font-semibold">Share your job</h2>
      <div className="grid gap-4 mt-4">
        <input className="border rounded-xl px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Suburb (type to search)</label>
            <SuburbAutocomplete value={picked} onPicked={setPicked} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Selected</label>
            <input className="border rounded-xl px-3 py-2 w-full bg-gray-50" value={selectedPreview} readOnly />
          </div>
        </div>

        <input className="border rounded-xl px-3 py-2" placeholder="Who did it (business or tradie name)" value={biz} onChange={(e) => setBiz(e.target.value)} />

        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={rec === "yes"} onChange={() => setRec("yes")} /> Recommend
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={rec === "no"} onChange={() => setRec("no")} /> Not recommend
          </label>
        </div>

        <div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType === "hidden"} onChange={() => setCostType("hidden")} /> Prefer not to say</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType === "exact"} onChange={() => setCostType("exact")} /> Exact</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={costType === "range"} onChange={() => setCostType("range")} /> Range</label>
          </div>
          {costType === "exact" && (
            <div className="mt-2 flex items-center gap-2">
              <span>$</span>
              <input className="border rounded-xl px-3 py-2 w-40" value={costExact} onChange={(e) => setCostExact(e.target.value)} placeholder="3899.99" />
            </div>
          )}
          {costType === "range" && (
            <div className="mt-2 flex items-center gap-2">
              <span>$</span>
              <input className="border rounded-xl px-3 py-2 w-36" value={costMin} onChange={(e) => setCostMin(e.target.value)} placeholder="180" />
              <span>to</span>
              <span>$</span>
              <input className="border rounded-xl px-3 py-2 w-36" value={costMax} onChange={(e) => setCostMax(e.target.value)} placeholder="320" />
            </div>
          )}
        </div>

        <textarea className="border rounded-xl px-3 py-2" rows={3} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end">
          <button onClick={submit} disabled={busy || !picked} className="px-4 py-2 rounded-xl bg-gray-900 text-white disabled:opacity-60">
            {busy ? "Posting…" : "Post job"}
          </button>
        </div>
      </div>
    </div>
  );
}
