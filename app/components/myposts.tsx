"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

export default function MyPosts() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/signin"; return; }
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setJobs(data as Job[]);
    })();
  }, []);

  async function save(updated: Job) {
    const { error } = await supabase.from("jobs").update(updated).eq("id", updated.id);
    if (error) return alert(error.message);
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return alert(error.message);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">My posts</h2>
      {jobs.length === 0 && <p className="text-sm text-gray-600">You haven't posted any jobs yet.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((j) => (
          <Card key={j.id} job={j} onSave={save} onDelete={remove} />
        ))}
      </div>
    </section>
  );
}

function Card({ job, onSave, onDelete }: { job: Job; onSave: (j: Job) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Job>({ ...job });

  useEffect(() => setDraft({ ...job }), [job]);

  function save() {
    if (!draft.title.trim() || !draft.suburb.trim() || !/^\d{4}$/.test(draft.postcode) || !draft.business_name.trim()) {
      alert("Please complete required fields (title, suburb, postcode, business)");
      return;
    }
    onSave(draft);
    setEditing(false);
  }

  const fmt = (c?: number|null) =>
    c==null ? "" : new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(c/100);

  function copyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://burbli.vercel.app";
    const url = `${origin}/post/${job.id}`;
    navigator.clipboard?.writeText(url).then(
      () => alert("Link copied to clipboard"),
      () => window.prompt("Copy this link", url)
    );
  }

  return (
    <article className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input className="font-medium rounded-lg border px-2 py-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        ) : (
          <h3 className="font-medium">{job.title}</h3>
        )}
        <span className={`text-xs px-2 py-1 rounded ${job.recommend ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {job.recommend ? "Recommended" : "Not recommended"}
        </span>
      </div>

      <div className="mt-1 text-sm text-gray-600">
        {editing ? (
          <div className="flex gap-2 items-center">
            <input className="w-28 rounded-lg border px-2 py-1" value={draft.suburb} onChange={(e) => setDraft({ ...draft, suburb: e.target.value })} />
            <select className="rounded-lg border px-2 py-1" value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value as any })}>
              {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input className="w-20 rounded-lg border px-2 py-1" value={draft.postcode} onChange={(e) => setDraft({ ...draft, postcode: e.target.value })} />
          </div>
        ) : (
          <span>{job.suburb}, {job.state} {job.postcode}</span>
        )}
      </div>

      <div className="mt-1 text-sm">
        {editing ? (
          <input className="rounded-lg border px-2 py-1" value={draft.business_name} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} />
        ) : (
          <>Done by <span className="font-medium">{job.business_name}</span></>
        )}
      </div>

      <div className="mt-2 text-sm">
        {job.cost_type !== "hidden" ? (
          <>Cost: {job.cost_type === "exact"
            ? (editing
                ? <input className="w-28 rounded-lg border px-2 py-1 ml-1" value={(draft.cost_amount ?? 0)/100} onChange={(e)=>setDraft({ ...draft, cost_amount: Math.round(parseFloat(e.target.value)*100) })}/>
                : <span className="font-medium ml-1">{fmt(job.cost_amount)}</span>)
            : (editing
                ? <>
                    <input className="w-24 rounded-lg border px-2 py-1 ml-1" value={(draft.cost_min ?? 0)/100} onChange={(e)=>setDraft({ ...draft, cost_min: Math.round(parseFloat(e.target.value)*100) })}/>
                    <span className="mx-1">to</span>
                    <input className="w-24 rounded-lg border px-2 py-1" value={(draft.cost_max ?? 0)/100} onChange={(e)=>setDraft({ ...draft, cost_max: Math.round(parseFloat(e.target.value)*100) })}/>
                  </>
                : <span className="font-medium ml-1">{fmt(job.cost_min)}–{fmt(job.cost_max)}</span>)}
          </>
        ) : (
          <span className="text-gray-500">Cost hidden by user</span>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-600">
        {editing ? (
          <textarea className="w-full rounded-lg border px-2 py-1" rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        ) : (
          job.notes
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {editing ? (
          <>
            <button onClick={save} className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black text-sm">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl border text-sm">Cancel</button>
          </>
        ) : (
          <>
            <a href={`/post/${job.id}`} className="px-3 py-2 rounded-xl border text-sm" target="_blank">Open</a>
            <button onClick={copyLink} className="px-3 py-2 rounded-xl border text-sm">Copy link</button>
            <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl border text-sm">Edit</button>
            <button onClick={() => onDelete(job.id)} className="px-3 py-2 rounded-xl border text-sm text-red-600">Delete</button>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500">Posted {new Date(job.created_at).toLocaleDateString()}</span>
      </div>
    </article>
  );
}
