// components/JobForm.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  onCreated?: (job: Job) => void;
};

type CostType = "exact" | "range" | "na";

export default function JobForm({ onCreated }: Props) {
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [business, setBusiness] = useState("");
  const [recommend, setRecommend] = useState<"yes" | "no">("yes");

  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("VIC");
  const [postcode, setPostcode] = useState("");

  const [costType, setCostType] = useState<CostType>("exact");
  const [costExact, setCostExact] = useState<string>("");
  const [costMin, setCostMin] = useState<string>("");
  const [costMax, setCostMax] = useState<string>("");

  const [notes, setNotes] = useState("");

  const costHelp = useMemo(() => {
    if (costType === "exact") return "Exact total (AUD). Whole numbers only, e.g. 2500.";
    if (costType === "range") return "Enter min and max (AUD). Whole numbers only.";
    return "If you’d prefer not to share cost, choose this.";
  }, [costType]);

  function numOrNull(s: string): number | null {
    const n = Number(s.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  async function submit() {
    // Validate required
    if (!title.trim() || !business.trim() || !suburb.trim() || !state.trim() || !/^\d{4}$/.test(postcode)) {
      alert("Please complete: Title, Who did it, Suburb, State, 4-digit Postcode.");
      return;
    }

    // Validate cost fields based on type
    let payload: Partial<Job> = {
      title: title.trim(),
      business_name: business.trim(),
      recommend: recommend === "yes",
      suburb: suburb.trim(),
      state: state.trim(),
      postcode: postcode.trim(),
      cost_type: costType,
      notes: notes.trim() ? notes.trim() : null,
    };

    if (costType === "exact") {
      const v = numOrNull(costExact);
      if (v == null) {
        alert("Please enter a valid exact cost (whole number).");
        return;
      }
      payload.cost_exact = v;
      payload.cost_min = null;
      payload.cost_max = null;
    } else if (costType === "range") {
      const vMin = numOrNull(costMin);
      const vMax = numOrNull(costMax);
      if (vMin == null || vMax == null || vMin > vMax) {
        alert("Please enter a valid cost range (min ≤ max, whole numbers).");
        return;
      }
      payload.cost_min = vMin;
      payload.cost_max = vMax;
      payload.cost_exact = null;
    } else {
      payload.cost_exact = null;
      payload.cost_min = null;
      payload.cost_max = null;
    }

    setSaving(true);

    // Attach owner_id from current session
    const { data: session } = await supabase.auth.getUser();
    const owner = session?.data?.user?.id ?? null;
    payload.owner_id = owner;

    const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();
    setSaving(false);

    if (error) {
      console.error(error);
      alert("Could not save. Please try again.");
      return;
    }

    // Reset form (keep state for convenience)
    setTitle("");
    setBusiness("");
    setRecommend("yes");
    setSuburb("");
    setState("VIC");
    setPostcode("");
    setCostType("exact");
    setCostExact("");
    setCostMin("");
    setCostMax("");
    setNotes("");

    onCreated?.(data as Job);
  }

  return (
    <article className="rounded-2xl border bg-white p-5 md:p-6">
      <h2 className="text-lg font-semibold">Post job</h2>
      <p className="mt-1 text-sm text-gray-600">
        Share work you’ve had done — whether you’d recommend it or not.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Title *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g., New Colorbond roof installed"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Who did it *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Business or tradie name"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Recommend?</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={recommend}
            onChange={(e) => setRecommend(e.target.value as "yes" | "no")}
          >
            <option value="yes">Yes, I recommend</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Suburb *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g., Epping"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">State *</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {["VIC","NSW","QLD","SA","WA","TAS","ACT","NT"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Postcode *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="4 digits"
            inputMode="numeric"
            pattern="\d{4}"
            value={postcode}
            onChange={(e) =>
              setPostcode(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
            }
          />
        </div>

        {/* Cost group */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Cost</label>
          <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              className="rounded-xl border px-3 py-2"
              value={costType}
              onChange={(e) => setCostType(e.target.value as CostType)}
            >
              <option value="exact">Exact</option>
              <option value="range">Range</option>
              <option value="na">Prefer not to say</option>
            </select>

            {costType === "exact" && (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Exact amount"
                inputMode="numeric"
                value={costExact}
                onChange={(e) => setCostExact(e.target.value)}
              />
            )}

            {costType === "range" && (
              <>
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="Min"
                  inputMode="numeric"
                  value={costMin}
                  onChange={(e) => setCostMin(e.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="Max"
                  inputMode="numeric"
                  value={costMax}
                  onChange={(e) => setCostMax(e.target.value)}
                />
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">{costHelp}</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Details</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={5}
            placeholder="Any context you’d like to share…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Post job"}
        </button>
      </div>
    </article>
  );
}
