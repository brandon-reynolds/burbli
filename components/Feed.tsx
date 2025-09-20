"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  business_name: string;
  recommend: boolean;
  cost_type: "exact"|"range"|"hidden";
  cost_amount?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  created_at: string;
};

export default function Feed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (!error && data) setJobs(data as Job[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const s = q.toLowerCase();
      const okQ = !s || [j.title, j.suburb, j.business_name, j.postcode].some(v => v.toLowerCase().includes(s));
      const okS = !state || j.state === state;
      return okQ && okS;
    });
  }, [jobs, q, state]);

  const fmt = (c?: number|null) => c==null ? "" :
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c/100);

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input className="w-full rounded-xl border px-3 py-2"
                 placeholder="Suburb, business, postcode, title…"
                 value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <select className="rounded-xl border px-3 py-2" value={state} onChange={e=>setState(e.target.value)}>
            <option value="">All</option>
            {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(j => (
          <article key={j.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{j.title}</h3>
              <span className={`text-xs px-2 py-1 rounded ${j.recommend ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {j.recommend ? "Recommended" : "Not recommended"}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">{j.suburb}, {j.state} {j.postcode}</div>
            <div className="mt-1 text-sm">Done by <span className="font-medium">{j.business_name}</span></div>
            {j.cost_type !== "hidden" && (
              <div className="mt-1 text-sm">
                Cost: <span className="font-medium">
                  {j.cost_type === "exact" ? fmt(j.cost_amount) : `${fmt(j.cost_min)}–${fmt(j.cost_max)}`}
                </span>
              </div>
            )}
            {j.notes && <p className="mt-2 text-sm text-gray-600">{j.notes}</p>}
          </article>
        ))}
        {filtered.length === 0 && <div className="text-sm text-gray-500">No jobs match your filters yet.</div>}
      </div>
    </div>
  );
}

