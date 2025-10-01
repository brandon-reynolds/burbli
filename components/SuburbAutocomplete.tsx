// components/SuburbAutocomplete.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Picked = {
  label: string;          // e.g., "Epping, VIC 3076"
  suburb: string | null;
  state: string | null;   // VIC / NSW / …
  postcode: string | null;
};

type Props = {
  label?: string;                     // initial display text
  placeholder?: string;
  disabled?: boolean;
  onPick: (p: Picked) => void;        // send chosen parts to parent
  onBlurAutoFillEmpty?: boolean;      // if true and there is a top result, pick it on blur
  className?: string;                 // extra classes for the wrapper
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function SuburbAutocomplete({
  label = "",
  placeholder = "Start typing a suburb…",
  disabled = false,
  onPick,
  onBlurAutoFillEmpty = false,
  className = "",
}: Props) {
  const [query, setQuery] = useState(label);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Picked[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useMemo(() => `suburb-list-${Math.random().toString(36).slice(2)}`, []);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !rootRef.current) return;
      if (!rootRef.current.contains(el)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Debounced search (first letter onward)
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
        url.searchParams.set("access_token", MAPBOX_TOKEN);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("country", "AU");                       // AU-only
        url.searchParams.set("language", "en");
        url.searchParams.set("types", "place,locality,postcode");    // suburb/locality/postcode
        url.searchParams.set("limit", "8");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();

        const next: Picked[] = (json?.features ?? []).map((f: any) => {
          const suburb = (f?.text ?? null) as string | null;

          // Context: region (state) & postcode
          const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
          const region = ctx.find((c) => typeof c.id === "string" && c.id.startsWith("region"));
          const postcode = ctx.find((c) => typeof c.id === "string" && c.id.startsWith("postcode"));

          // Region short_code typically "AU-VIC"
          let state: string | null = null;
          const sc = region?.short_code as string | undefined;
          if (sc && /^AU-/.test(sc)) state = sc.slice(3).toUpperCase();
          else if (region?.text) state = String(region.text).toUpperCase();

          const pc = postcode?.text ? String(postcode.text) : null;

          const labelBits = [suburb, state, pc].filter(Boolean).join(", ");
          return {
            label: labelBits || (f.place_name as string),
            suburb,
            state,
            postcode: pc,
          } as Picked;
        });

        // De-dup by label
        const seen = new Set<string>();
        const unique = next.filter((i) => (seen.has(i.label) ? false : (seen.add(i.label), true)));

        setItems(unique);
        setActiveIndex(unique.length ? 0 : -1);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [query]);

  function choose(i: number) {
    const it = items[i];
    if (!it) return;
    setQuery(it.label);
    setOpen(false);
    onPick(it);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((v) => (v + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((v) => (v - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  async function onBlur() {
    // Optionally auto-pick the first when user tabs/clicks away
    if (onBlurAutoFillEmpty && query.trim() && items.length && !items.find(i => i.label === query.trim())) {
      choose(0);
    }
  }

  const emptyState = !loading && query.trim() && items.length === 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (items.length) setOpen(true); }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full rounded-xl border px-3 py-2 md:py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setItems([]); setOpen(false); setActiveIndex(-1); }}
            className="shrink-0 rounded-lg border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            aria-label="Clear"
            title="Clear"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          id={listId}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white p-1 shadow-lg"
        >
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          )}

          {items.map((it, idx) => (
            <button
              key={`${it.label}-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(idx)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm ${
                idx === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }} // good touch target
              title={it.label}
            >
              <span className="truncate">
                {/* Left: "Suburb, STATE" */}
                {it.suburb}
                {it.state ? `, ${it.state}` : ""}
              </span>

              {/* Right: postcode badge (always visible, even if null -> hidden) */}
              {it.postcode ? (
                <span className="ml-3 shrink-0 rounded-full border bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                  {it.postcode}
                </span>
              ) : (
                <span className="ml-3 shrink-0 w-0" />
              )}
            </button>
          ))}

          {emptyState && (
            <div className="px-3 py-2 text-sm text-gray-500">No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}
