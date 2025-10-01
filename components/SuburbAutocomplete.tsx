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
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  onPick: (p: Picked) => void;
  onBlurAutoFillEmpty?: boolean;
  className?: string;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/** Extract suburb/state/postcode reliably from a Mapbox feature (AU only). */
function parseAUFeature(f: any): { suburb: string | null; state: string | null; postcode: string | null } {
  const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
  const getCtx = (prefix: string) => ctx.find((c) => typeof c?.id === "string" && c.id.startsWith(prefix));

  const region = getCtx("region");
  const placeInCtx = getCtx("place") ?? getCtx("locality");
  const postcodeInCtx = getCtx("postcode");

  // State: prefer region.short_code AU-XX, else region.text uppercased
  let state: string | null = null;
  const sc = region?.short_code as string | undefined;
  if (sc && /^AU-/.test(sc)) state = sc.slice(3).toUpperCase();
  else if (region?.text) state = String(region.text).toUpperCase();

  // Suburb: if feature IS a place/locality, use its text; if it IS a postcode, use the place/locality from context
  const isPlace = Array.isArray(f?.place_type) && (f.place_type.includes("place") || f.place_type.includes("locality"));
  const isPostcode = Array.isArray(f?.place_type) && f.place_type.includes("postcode");

  let suburb: string | null = null;
  if (isPlace) {
    suburb = f?.text ?? null;
  } else if (isPostcode) {
    suburb = placeInCtx?.text ?? null;
  } else {
    // Fallback: sometimes "place" is given as "text" even if primary type is "district" etc.
    suburb = (placeInCtx?.text ?? f?.text) ?? null;
  }

  // Postcode: prefer explicit postcode in context, else properties.postcode,
  // else if feature itself is a postcode, its text is that postcode.
  let postcode: string | null =
    (postcodeInCtx?.text as string | undefined) ??
    (f?.properties?.postcode as string | undefined) ??
    (isPostcode ? (f?.text as string | undefined) : undefined) ??
    null;

  return { suburb, state, postcode };
}

/** Build "Suburb, STATE POSTCODE" from pieces (omit blanks gracefully). */
function buildLabel(suburb: string | null, state: string | null, postcode: string | null) {
  const left = [suburb, state].filter(Boolean).join(", ");
  return left + (postcode ? ` ${postcode}` : "");
}

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
  const [isFocused, setIsFocused] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
        url.searchParams.set("access_token", MAPBOX_TOKEN);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("country", "AU");
        url.searchParams.set("language", "en");
        // Include postcode so "3076" returns postcode hits, plus place/locality
        url.searchParams.set("types", "postcode,place,locality");
        url.searchParams.set("limit", "8");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();

        const mapped: Picked[] = (json?.features ?? []).map((f: any) => {
          const { suburb, state, postcode } = parseAUFeature(f);
          const label = buildLabel(suburb, state, postcode) || (f?.place_name as string);
          return {
            label,
            suburb: suburb ?? null,
            state: state ?? null,
            postcode: postcode ?? null,
          };
        });

        // De-dup by label (keep first occurrence)
        const seen = new Set<string>();
        const unique = mapped.filter((i) => {
          if (seen.has(i.label)) return false;
          seen.add(i.label);
          return true;
        });

        setItems(unique);
        setActiveIndex(unique.length ? 0 : -1);
        setOpen(isFocused && unique.length > 0); // only open if input is focused
      } catch {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [query, isFocused]);

  function choose(i: number) {
    const it = items[i];
    if (!it) return;
    setQuery(it.label);   // show full "Epping, VIC 3076"
    setOpen(false);
    onPick(it);
    // Blur to prevent immediate reopen on focus handlers
    setTimeout(() => inputRef.current?.blur(), 0);
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

  function onFocus() {
    setIsFocused(true);
    if (items.length) setOpen(true);
  }

  function onBlur() {
    // Slight delay to allow click on an option
    setTimeout(() => {
      setIsFocused(false);
      if (
        onBlurAutoFillEmpty &&
        query.trim() &&
        items.length &&
        !items.find((i) => i.label === query.trim())
      ) {
        choose(0);
      } else {
        setOpen(false);
      }
    }, 0);
  }

  const emptyState = !loading && query.trim() && items.length === 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border pl-3 pr-9 py-2 md:py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
        />

        {/* Inline clear “✕” inside the input */}
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setItems([]);
              setOpen(false);
              setActiveIndex(-1);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            aria-label="Clear"
            title="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
          >
            ✕
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
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}

          {items.map((it, idx) => (
            <button
              key={`${it.label}-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(idx)}
              className={`flex w-full items-center rounded-lg px-3 py-3 text-left text-sm ${
                idx === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
              title={it.label}
            >
              {/* Always show the single combined label */}
              <span className="truncate">{it.label}</span>
            </button>
          ))}

          {emptyState && <div className="px-3 py-2 text-sm text-gray-500">No matches.</div>}
        </div>
      )}
    </div>
  );
}
