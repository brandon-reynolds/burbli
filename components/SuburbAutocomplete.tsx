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

/** Small fetch helper */
async function geocode(endpoint: string, params: Record<string, string>) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("geocode error");
  return res.json();
}

/** Extract suburb/state/postcode from a Mapbox feature (AU). */
function parseAUFeature(f: any): { suburb: string | null; state: string | null; postcode: string | null } {
  const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
  const getCtx = (prefix: string) => ctx.find((c) => typeof c?.id === "string" && c.id.startsWith(prefix));

  const region = getCtx("region");
  const placeCtx = getCtx("place") ?? getCtx("locality");
  const postcodeCtx = getCtx("postcode");

  // State: prefer region.short_code AU-XX
  let state: string | null = null;
  const sc = region?.short_code as string | undefined;
  if (sc && /^AU-/.test(sc)) state = sc.slice(3).toUpperCase();
  else if (region?.text) state = String(region.text).toUpperCase();

  const placeType: string[] = Array.isArray(f?.place_type) ? f.place_type : [];
  const isPlaceLike = placeType.includes("place") || placeType.includes("locality");
  const isPostcode = placeType.includes("postcode");

  let suburb: string | null = null;
  if (isPlaceLike) suburb = f?.text ?? null;
  else if (isPostcode) suburb = placeCtx?.text ?? null;
  else suburb = (placeCtx?.text ?? f?.text) ?? null;

  let postcode: string | null =
    (postcodeCtx?.text as string | undefined) ??
    (f?.properties?.postcode as string | undefined) ??
    (isPostcode ? (f?.text as string | undefined) : undefined) ??
    null;

  return { suburb, state, postcode };
}

function buildLabel(suburb: string | null, state: string | null, postcode: string | null) {
  const left = [suburb, state].filter(Boolean).join(", ");
  return left + (postcode ? ` ${postcode}` : "");
}

/** Get the nearest postcode digits around a lon/lat. */
async function postcodeNear([lon, lat]: [number, number]): Promise<string | null> {
  const json = await geocode(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/postcode.json`,
    {
      access_token: MAPBOX_TOKEN,
      country: "AU",
      language: "en",
      types: "postcode",
      proximity: `${lon},${lat}`,
      limit: "1",
      autocomplete: "true",
    }
  );
  const f = json?.features?.[0];
  if (!f) return null;
  const pt = Array.isArray(f?.place_type) && f.place_type.includes("postcode");
  return pt ? String(f?.text ?? "") || null : null;
}

/** Find places near a postcode feature’s center and return a few labelled options. */
async function placesForPostcode(fPostcode: any, limit = 6): Promise<Picked[]> {
  const center = fPostcode?.center as [number, number] | undefined;
  if (!center) return [];

  // State from the postcode feature (via context)
  const { state } = parseAUFeature(fPostcode);
  const digits = String(fPostcode?.text ?? "");

  const json = await geocode(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/place.json`,
    {
      access_token: MAPBOX_TOKEN,
      country: "AU",
      language: "en",
      types: "place,locality",
      proximity: `${center[0]},${center[1]}`,
      limit: String(limit),
      autocomplete: "true",
    }
  );

  const out: Picked[] = (json?.features ?? []).map((pf: any) => {
    const parsed = parseAUFeature(pf);
    // Build label with the known postcode digits from the original feature
    const label = buildLabel(parsed.suburb, parsed.state ?? state, digits) || (pf?.place_name as string);
    return {
      label,
      suburb: parsed.suburb ?? null,
      state: (parsed.state ?? state) ?? null,
      postcode: digits || null,
    };
  });

  // de-dup by label
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.label) ? false : (seen.add(i.label), true)));
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

  // Debounced search
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

        // If input is exactly a 4-digit postcode, run the postcode-first flow
        if (/^\d{4}$/.test(q)) {
          const pcJson = await geocode(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
            {
              access_token: MAPBOX_TOKEN,
              country: "AU",
              language: "en",
              types: "postcode",
              limit: "1",
              autocomplete: "true",
            }
          );

          const pcFeature = pcJson?.features?.[0];
          if (pcFeature) {
            const options = await placesForPostcode(pcFeature, 6);
            setItems(options);
            setActiveIndex(options.length ? 0 : -1);
            setOpen(isFocused && options.length > 0);
            return;
          }
          // fall through to generic search if nothing found
        }

        // Generic search: place/locality/postcode together
        const base = await geocode(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
          {
            access_token: MAPBOX_TOKEN,
            country: "AU",
            language: "en",
            types: "place,locality,postcode",
            limit: "8",
            autocomplete: "true",
          }
        );

        const feats: any[] = base?.features ?? [];
        // Prefer place/locality results, keep postcode as supplement
        const placeFirst = feats.sort((a, b) => {
          const aPlace = a.place_type?.includes("place") || a.place_type?.includes("locality") ? 0 : 1;
          const bPlace = b.place_type?.includes("place") || b.place_type?.includes("locality") ? 0 : 1;
          return aPlace - bPlace;
        });

        // Map initial results
        const prelim: {
          f: any;
          parsed: { suburb: string | null; state: string | null; postcode: string | null };
          center?: [number, number];
        }[] = placeFirst.map((f) => ({
          f,
          parsed: parseAUFeature(f),
          center: Array.isArray(f?.center) ? (f.center as [number, number]) : undefined,
        }));

        // For top N items missing postcode, fetch 1 postcode near center
        const ENRICH_N = 5;
        await Promise.all(
          prelim.slice(0, ENRICH_N).map(async (row) => {
            if (!row.parsed.postcode && row.center) {
              const pc = await postcodeNear(row.center);
              if (pc) row.parsed.postcode = pc;
            }
          })
        );

        // Build final list with labels
        const mapped: Picked[] = prelim.map(({ parsed, f }) => {
          const label = buildLabel(parsed.suburb, parsed.state, parsed.postcode) || (f?.place_name as string);
          return {
            label,
            suburb: parsed.suburb ?? null,
            state: parsed.state ?? null,
            postcode: parsed.postcode ?? null,
          };
        });

        // De-dup by label
        const seen = new Set<string>();
        const unique = mapped.filter((i) => (seen.has(i.label) ? false : (seen.add(i.label), true)));

        setItems(unique);
        setActiveIndex(unique.length ? 0 : -1);
        setOpen(isFocused && unique.length > 0);
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border pl-3 pr-9 py-2 md:py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
        />

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
              <span className="truncate">{it.label}</span>
            </button>
          ))}

          {emptyState && <div className="px-3 py-2 text-sm text-gray-500">No matches.</div>}
        </div>
      )}
    </div>
  );
}
