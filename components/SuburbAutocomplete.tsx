"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type PickedSuburb = {
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
};

type Locality = PickedSuburb;

function norm(s: string) {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export default function SuburbAutocomplete({
  value,
  onPicked,
  placeholder = "Start typing a suburb (e.g. Epping)…",
  max = 12,
}: {
  value: PickedSuburb | null;
  onPicked: (v: PickedSuburb | null) => void;
  placeholder?: string;
  max?: number;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Locality[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load static dataset (served from /public)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/au_localities.min.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Locality[];
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load localities");
      }
    })();
    return () => { alive = false; };
  }, []);

  // Reflect selected value in input
  useEffect(() => {
    if (value) setQ(`${value.suburb}, ${value.state} ${value.postcode}`);
    else setQ("");
  }, [value]);

  const results = useMemo(() => {
    if (!data || !q || value) return [];
    const nq = norm(q);
    const hits = data.filter((d) => {
      const key = `${d.suburb}, ${d.state} ${d.postcode}`;
      return norm(d.suburb).startsWith(nq) || norm(key).includes(nq);
    });
    return hits.slice(0, max);
  }, [data, q, value, max]);

  // Keep the list open while typing
  useEffect(() => {
    if (document.activeElement === inputRef.current && !value) {
      setOpen(results.length > 0);
    }
  }, [results.length, value]);

  function choose(loc: Locality) {
    onPicked(loc);
    setOpen(false);
  }

  // 🚀 Auto-pick immediately when:
  //  - exact match typed (e.g. "Epping, VIC 3076" or "Epping")
  //  - OR only a single result remains (after 3+ chars)
  useEffect(() => {
    if (value) return; // already chosen
    if (!q || results.length === 0) return;
    const nq = norm(q);
    const exact =
      results.find(r => norm(`${r.suburb}, ${r.state} ${r.postcode}`) === nq) ||
      results.find(r => norm(r.suburb) === nq);
    if (exact) {
      choose(exact);
      return;
    }
    if (results.length === 1 && nq.length >= 3) {
      choose(results[0]);
    }
  }, [q, results, value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        className="w-full rounded-xl border px-3 py-2"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          onPicked(null);           // clear picked while user edits
          setQ(e.target.value);
          setOpen(true);            // show options as you type
        }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0 && !value) {
            e.preventDefault();
            choose(results[0]);     // Enter picks the top suggestion
          }
          if (e.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {err && <p className="mt-1 text-xs text-amber-700">{err}</p>}

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow max-h-72 overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.suburb}-${r.state}-${r.postcode}`}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
              onMouseDown={(e) => e.preventDefault()}   // avoid losing focus before click
              onClick={() => choose(r)}
            >
              {r.suburb}, {r.state} {r.postcode}
            </button>
          ))}
        </div>
      )}

      {!value && q && results.length === 0 && !err && (
        <p className="mt-1 text-xs text-gray-500">No matches yet. Keep typing…</p>
      )}
      {!data && !err && <p className="mt-1 text-xs text-gray-500">Loading suburbs…</p>}
      {/* No "Selected" line — single-field UX */}
    </div>
  );
}
