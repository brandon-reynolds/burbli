// components/SuburbPicker.tsx
"use client";
import { useEffect, useRef, useState } from "react";

export type PickedSuburb = { suburb: string; state: string; postcode: string };

export default function SuburbPicker({
  value,
  onPicked,
  placeholder = "Start typing a suburb (e.g. Epping)…",
}: {
  value: PickedSuburb | null;
  onPicked: (v: PickedSuburb | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ place_id: string; description: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // reflect selected value in input
  useEffect(() => {
    if (value) setQ(`${value.suburb}, ${value.state} ${value.postcode}`);
    else setQ("");
  }, [value]);

  // fetch suggestions (debounced)
  useEffect(() => {
    if (!q || value) return; // don't search when a value is fixed
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) {
          setErr(data?.error_message || data?.error || "Search failed");
          setItems([]);
        } else {
          setItems(data.predictions ?? []);
          setOpen(true);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Search failed");
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, value]);

  async function choose(place_id: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/places?place_id=${encodeURIComponent(place_id)}`);
      const data = await res.json();
      if (!res.ok || !data?.suburb || !data?.state || !data?.postcode) {
        setErr(data?.error || "Couldn’t read suburb details");
        return;
      }
      onPicked({ suburb: data.suburb, state: data.state, postcode: data.postcode });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className="w-full rounded-xl border px-3 py-2"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          onPicked(null);
          setQ(e.target.value);
        }}
        onFocus={() => items.length && setOpen(true)}
      />
      {loading && <p className="mt-1 text-xs text-gray-500">Searching…</p>}
      {err && <p className="mt-1 text-xs text-amber-700">{err}</p>}
      {open && items.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow">
          {items.slice(0, 8).map((it) => (
            <button
              key={it.place_id}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => choose(it.place_id)}
            >
              {it.description}
            </button>
          ))}
        </div>
      )}
      {!value && q && !loading && items.length === 0 && !err && (
        <p className="mt-1 text-xs text-gray-500">No matches yet. Keep typing…</p>
      )}
    </div>
  );
}
