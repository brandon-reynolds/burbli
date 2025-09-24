// components/JobForm.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type JobFormProps = {
  job?: Job; // optional for editing
  onCreated?: (j: Job) => void; // ✅ added prop type
};

export default function JobForm({ job, onCreated }: JobFormProps) {
  const [title, setTitle] = useState(job?.title ?? "");
  const [business, setBusiness] = useState(job?.business_name ?? "");
  const [suburb, setSuburb] = useState(job?.suburb ?? "");
  const [state, setState] = useState(job?.state ?? "");
  const [postcode, setPostcode] = useState(job?.postcode ?? "");
  const [recommend, setRecommend] = useState(job?.recommend ?? false);
  const [costType, setCostType] = useState<Job["cost_type"]>(job?.cost_type ?? "exact");
  const [cost, setCost] = useState(job?.cost ? String(job.cost) : "");
  const [costMin, setCostMin] = useState(job?.cost_min ? String(job.cost_min) : "");
  const [costMax, setCostMax] = useState(job?.cost_max ? String(job.cost_max) : "");
  const [details, setDetails] = useState(job?.details ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload: Partial<Job> = {
      title,
      business_name: business,
      suburb,
      state,
      postcode,
      recommend,
      cost_type: costType,
      cost: costType === "exact" ? (cost ? Number(cost) : null) : null,
      cost_min: costType === "range" ? (costMin ? Number(costMin) : null) : null,
      cost_max: costType === "range" ? (costMax ? Number(costMax) : null) : null,
      details,
    };

    let data: Job | null = null;
    let error = null;

    if (job) {
      // editing
      const res = await supabase.from("jobs").update(payload).eq("id", job.id).select("*").single();
      data = res.data as Job | null;
      error = res.error;
    } else {
      // creating
      const { data: { user } } = await supabase.auth.getUser();
      payload.owner_id = user?.id ?? null;

      const res = await supabase.from("jobs").insert(payload).select("*").single();
      data = res.data as Job | null;
      error = res.error;
    }

    setLoading(false);

    if (error) {
      alert(error.message);
    } else if (data) {
      onCreated?.(data); // ✅ call callback
      if (!job) {
        // clear form only if new job
        setTitle("");
        setBusiness("");
        setSuburb("");
        setState("");
        setPostcode("");
        setRecommend(false);
        setCost("");
        setCostMin("");
        setCostMax("");
        setDetails("");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 space-y-4">
      <h2 className="text-xl font-semibold">{job ? "Edit Project" : "Share a Project"}</h2>

      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          className="mt-1 w-full rounded-xl border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Who did it *</label>
        <input
          className="mt-1 w-full rounded-xl border p-2"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">Suburb *</label>
          <input
            className="mt-1 w-full rounded-xl border p-2"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">State *</label>
          <input
            className="mt-1 w-full rounded-xl border p-2"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Postcode *</label>
          <input
            className="mt-1 w-full rounded-xl border p-2"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Cost *</label>
        <select
          className="mt-1 w-full rounded-xl border p-2"
          value={costType}
          onChange={(e) => setCostType(e.target.value as Job["cost_type"])}
        >
          <option value="exact">Exact</option>
          <option value="range">Range</option>
          <option value="na">Prefer not to say</option>
        </select>
        {costType === "exact" && (
          <input
            className="mt-2 w-full rounded-xl border p-2"
            placeholder="Enter cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        )}
        {costType === "range" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border p-2"
              placeholder="Min"
              value={costMin}
              onChange={(e) => setCostMin(e.target.value)}
            />
            <input
              className="rounded-xl border p-2"
              placeholder="Max"
              value={costMax}
              onChange={(e) => setCostMax(e.target.value)}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Details</label>
        <textarea
          className="mt-1 w-full rounded-xl border p-2"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={recommend}
          onChange={(e) => setRecommend(e.target.checked)}
        />
        Recommended
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
      >
        {loading ? "Saving…" : job ? "Save changes" : "Share project"}
      </button>
    </form>
  );
}
