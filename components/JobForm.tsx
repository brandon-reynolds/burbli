"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  mode?: "create" | "update";
  initial?: Job | null;
  onCreated?: (job: Job) => void;
  onSaved?: (job: Job) => void;
};

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

export default function JobForm({ mode = "create", initial, onCreated, onSaved }: Props) {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [business, setBusiness] = useState(initial?.business_name ?? "");
  const [suburb, setSuburb] = useState(initial?.suburb ?? "");
  const [state, setState] = useState<string>(initial?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [recommend, setRecommend] = useState<boolean>(initial?.recommend ?? true);
  const [costType, setCostType] = useState<"exact" | "range" | "na">(initial?.cost_type ?? "exact");
  const [costExact, setCostExact] = useState<string>(
    initial?.cost_exact != null ? String(initial.cost_exact) : ""
  );
  const [costMin, setCostMin] = useState<string>(initial?.cost_min != null ? String(initial.cost_min) : "");
  const [costMax, setCostMax] = useState<string>(initial?.cost_max != null ? String(initial.cost_max) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOwnerId(user?.id ?? null);
    })();
  }, []);

  async function submit() {
    if (!title.trim() || !business.trim() || !suburb.trim() || !/^\d{4}$/.test(postcode)) {
      alert("Please complete required fields (title, who did it, suburb, postcode).");
      return;
    }
    setSaving(true);

    const payload: any = {
      title: title.trim(),
      business_name: business.trim(),
      suburb: suburb.trim(),
      state,
      postcode: postcode.trim(),
      recommend,
      notes: notes.trim() || null,
      cost_type: costType,
      cost_exact: null,
      cost_min: null,
      cost_max: null,
    };

    if (costType === "exact" && costExact.trim()) payload.cost_exact = Number(costExact);
    if (costType === "range" && costMin.trim() && costMax.trim()) {
      payload.cost_min = Number(costMin);
      payload.cost_max = Number(costMax);
    }

    if (mode === "update" && initial?.id) {
      const { data, error } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", initial.id)
        .eq("owner_id", ownerId)
        .select("*")
        .single();
      setSaving(false);
      if (error) {
        alert("Could not save changes.");
        return;
      }
      onSaved?.(data as Job);
      return;
    }

    // create
    payload.owner_id = ownerId ?? null;
    const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();
    setSaving(false);
    if (error) {
      alert("Could not post. Please try again.");
      return;
    }
    onCreated?.(data as Job);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border bg-white p-4 md:p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="e.g. Roof insulation replacement"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Who did it (business or tradie name)</label>
        <input
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Company or tradie"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Suburb</label>
          <input
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Epping"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Postcode</label>
          <input
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="3076"
            inputMode="numeric"
            pattern="\d{4}"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Recommendation</label>
        <div className="mt-1 flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={recommend === true}
              onChange={() => setRecommend(true)}
            />
            Recommend
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={recommend === false}
              onChange={() => setRecommend(false)}
            />
            Not recommend
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cost</label>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType === "exact"} onChange={() => setCostType("exact")} />
            Exact
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType === "range"} onChange={() => setCostType("range")} />
            Range
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={costType === "na"} onChange={() => setCostType("na")} />
            Prefer not to say
          </label>
        </div>

        {costType === "exact" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              value={costExact}
              onChange={(e) => setCostExact(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              inputMode="numeric"
              placeholder="e.g. 3500"
            />
          </div>
        )}

        {costType === "range" && (
          <div className="mt-2 flex max-w-md items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
                className="w-32 rounded-xl border px-3 py-2"
                inputMode="numeric"
                placeholder="min"
              />
            </div>
            <span className="text-gray-500">–</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
                className="w-32 rounded-xl border px-3 py-2"
                inputMode="numeric"
                placeholder="max"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Details (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Any extra context that would help neighbours."
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "update" ? "Save changes" : "Post job"}
        </button>
      </div>
    </form>
  );
}
