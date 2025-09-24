// components/JobForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  /** Pass a job to edit. If omitted/null -> create mode */
  initial?: Job | null;
};

type FormState = {
  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: string;
  recommend: boolean | null;
  cost_type: "exact" | "range" | "from" | "" | null;
  cost: string; // keep as string for inputs; convert later
  cost_min: string;
  cost_max: string;
  notes: string;
};

function toMoneyNumber(s: string): number | null {
  if (!s) return null;
  // remove $ and commas/spaces
  const cleaned = s.replace(/[,$\sA-Za-z]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function validate(state: FormState) {
  const errors: Record<string, string> = {};

  if (!state.title.trim()) errors.title = "Please add a title.";
  if (state.cost_type === "exact") {
    const c = toMoneyNumber(state.cost);
    if (c == null) errors.cost = "Enter an amount for ‘Exact’ cost.";
  }
  if (state.cost_type === "range") {
    const min = toMoneyNumber(state.cost_min);
    const max = toMoneyNumber(state.cost_max);
    if (min == null && max == null) {
      errors.cost_min = "Enter at least a minimum or maximum.";
      errors.cost_max = "Enter at least a minimum or maximum.";
    } else if (min != null && max != null && min > max) {
      errors.cost_min = "Min must be ≤ max.";
      errors.cost_max = "Max must be ≥ min.";
    }
  }
  if (state.cost_type === "from") {
    const c = toMoneyNumber(state.cost) ?? toMoneyNumber(state.cost_min);
    if (c == null) errors.cost = "Enter an amount for ‘From’ cost.";
  }

  return errors;
}

export default function JobForm({ initial = null }: Props) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [f, setF] = useState<FormState>(() => {
    const j = initial ?? ({} as Job);
    return {
      title: j.title ?? "",
      business_name: j.business_name ?? "",
      suburb: j.suburb ?? "",
      state: j.state ?? "",
      postcode: j.postcode ?? "",
      recommend: j.recommend ?? null,
      cost_type: (j.cost_type as any) ?? "",
      cost: j.cost != null ? String(j.cost) : "",
      cost_min: j.cost_min != null ? String(j.cost_min) : "",
      cost_max: j.cost_max != null ? String(j.cost_max) : "",
      notes: j.notes ?? "",
    };
  });

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ignore) setOwnerId(user?.id ?? null);
    })();
    return () => { ignore = true; };
  }, []);

  // Make cost inputs context-aware
  const costHint = useMemo(() => {
    switch (f.cost_type) {
      case "exact": return "Enter a single total (e.g., 1200).";
      case "range": return "Enter min and/or max (e.g., 800 — 1400).";
      case "from":  return "Enter a starting price (e.g., 500).";
      default: return "Choose how you want to share cost.";
    }
  }, [f.cost_type]);

  function up<K extends keyof FormState>(key: K, v: FormState[K]) {
    setF((s) => ({ ...s, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      alert("Please sign in to submit.");
      return;
    }
    // Validate
    const nextErrors = validate(f);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Build payload
    // Normalise cost fields based on cost_type (strip irrelevant ones)
    let cost: number | null = null;
    let cost_min: number | null = null;
    let cost_max: number | null = null;
    let cost_type: "exact" | "range" | "from" | null = f.cost_type ? (f.cost_type as any) : null;

    if (cost_type === "exact") {
      cost = toMoneyNumber(f.cost);
      cost_min = null;
      cost_max = null;
    } else if (cost_type === "range") {
      cost = null;
      cost_min = toMoneyNumber(f.cost_min);
      cost_max = toMoneyNumber(f.cost_max);
      // if only one side present, that's OK; DB + UI handle display
    } else if (cost_type === "from") {
      // prefer cost; fall back to min if user typed it there
      cost = toMoneyNumber(f.cost) ?? toMoneyNumber(f.cost_min);
      cost_min = null;
      cost_max = null;
    } else {
      // no selection: store best-effort if user typed something
      cost = toMoneyNumber(f.cost);
      cost_min = toMoneyNumber(f.cost_min);
      cost_max = toMoneyNumber(f.cost_max);
      if (!cost && !cost_min && !cost_max) cost_type = null;
    }

    const payload = {
      title: f.title.trim() || null,
      business_name: f.business_name.trim() || null,
      suburb: f.suburb.trim() || null,
      state: f.state.trim() || null,
      postcode: f.postcode.trim() || null,
      recommend: f.recommend,
      cost_type,
      cost,
      cost_min,
      cost_max,
      notes: f.notes.trim() || null,
      owner_id: ownerId,
    };

    setSaving(true);
    try {
      if (initial?.id) {
        // Update (owner-guarded)
        const { data, error } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", initial.id)
          .eq("owner_id", ownerId)
          .select("id")
          .single();

        if (error) throw error;
        router.push(`/post/${data.id}`);
      } else {
        // Insert
        const { data, error } = await supabase
          .from("jobs")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        router.push(`/post/${data.id}`);
      }
    } catch (err: any) {
      alert(err?.message ?? "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Reset irrelevant cost fields as user switches type (prevents stale saves)
  useEffect(() => {
    if (f.cost_type === "exact") {
      setF((s) => ({ ...s, cost_min: "", cost_max: "" }));
    } else if (f.cost_type === "range") {
      setF((s) => ({ ...s, cost: "" }));
    } else if (f.cost_type === "from") {
      setF((s) => ({ ...s, cost_min: "", cost_max: "" }));
    }
  }, [f.cost_type]);

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{initial ? "Edit project" : "Share your project"}</h2>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Post"}
        </button>
      </div>

      <Field label="Title" error={errors.title}>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={f.title}
          onChange={(e) => up("title", e.target.value)}
          placeholder="e.g., Toilet replacement"
        />
      </Field>

      <Field label="Who did it">
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={f.business_name}
          onChange={(e) => up("business_name", e.target.value)}
          placeholder="Business name (optional)"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Suburb">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={f.suburb}
            onChange={(e) => up("suburb", e.target.value)}
            placeholder="Epping"
          />
        </Field>
        <Field label="State">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={f.state}
            onChange={(e) => up("state", e.target.value)}
            placeholder="VIC"
          />
        </Field>
        <Field label="Postcode">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={f.postcode}
            onChange={(e) => up("postcode", e.target.value)}
            placeholder="3076"
          />
        </Field>
      </div>

      <Field label="Recommendation">
        <div className="flex gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="recommend"
              checked={f.recommend === true}
              onChange={() => up("recommend", true)}
            />
            <span>Recommended</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="recommend"
              checked={f.recommend === false}
              onChange={() => up("recommend", false)}
            />
            <span>Not recommended</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="recommend"
              checked={f.recommend === null}
              onChange={() => up("recommend", null)}
            />
            <span>Prefer not to say</span>
          </label>
        </div>
      </Field>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Cost</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={f.cost_type ?? ""}
              onChange={(e) => up("cost_type", (e.target.value || "") as any)}
            >
              <option value="">Select type…</option>
              <option value="exact">Exact</option>
              <option value="range">Range</option>
              <option value="from">From</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">{costHint}</p>
          </div>

          {/* Exact / From value */}
          <div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              inputMode="numeric"
              placeholder={f.cost_type === "from" ? "From amount e.g. 500" : "Exact amount e.g. 1200"}
              value={f.cost}
              onChange={(e) => up("cost", e.target.value)}
              disabled={f.cost_type === "range"}
            />
            {errors.cost ? <p className="mt-1 text-xs text-red-600">{errors.cost}</p> : null}
          </div>

          {/* Range min/max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                inputMode="numeric"
                placeholder="Min e.g. 800"
                value={f.cost_min}
                onChange={(e) => up("cost_min", e.target.value)}
                disabled={f.cost_type !== "range"}
              />
              {errors.cost_min ? <p className="mt-1 text-xs text-red-600">{errors.cost_min}</p> : null}
            </div>
            <div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                inputMode="numeric"
                placeholder="Max e.g. 1400"
                value={f.cost_max}
                onChange={(e) => up("cost_max", e.target.value)}
                disabled={f.cost_type !== "range"}
              />
              {errors.cost_max ? <p className="mt-1 text-xs text-red-600">{errors.cost_max}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <Field label="Details">
        <textarea
          className="w-full rounded-lg border px-3 py-2"
          rows={5}
          placeholder="What was done, any extras, special conditions, etc."
          value={f.notes}
          onChange={(e) => up("notes", e.target.value)}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Post"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
