"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type PickedSuburb = {
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
};

type Locality = PickedSuburb;

function norm(s: string) {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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

  useEffect(() => {
    if (value) setQ(`${value.suburb}, ${value.state} ${value.postcode}`);
    else setQ("");
  }, [value]);

  const results = useMemo(() => {
    if (!data || !q || value) return [];
    const nq = norm(q);
    const hits = data.filter((d) => {
      const key = `${d.suburb}, ${d.state} ${d.postcode}`;
      const nk = norm(key);
      return norm(d.suburb).startsWith(nq) || nk.includes(nq);
    });
    return hits.slice(0, max);
  }, [data, q, value, max]);

  function choose(loc: Locality) {
    onPicked(loc);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className="w-full rounded-xl border px-3 py-2"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { onPicked(null); setQ(e.target.value); }}
        onFocus={() => { if ((results?.length ?? 0) > 0) setOpen(true); }}
        autoComplete="off"
        spellCheck={false}
      />
      {err && <p className="mt-1 text-xs text-amber-700">{err}</p>}
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow max-h-72 overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.suburb}-${r.state}-${r.postcode}`}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
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
      {value && (
        <p className="mt-1 text-xs text-green-700">
          Selected: {value.suburb}, {value.state} {value.postcode}
        </p>
      )}
    </div>
  );
}
