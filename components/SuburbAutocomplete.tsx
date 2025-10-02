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

/* ------------------------------- util ---------------------------------- */

async function geocode(endpoint: string, params: Record<string, string>) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("geocode error");
  return res.json();
}

function dist([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseAUFeature(f: any): { suburb: string | null; state: string | null; postcode: string | null } {
  const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
  const getCtx = (prefix: string) => ctx.find((c) => typeof c?.id === "string" && c.id.startsWith(prefix));

  const region = getCtx("region");
  const placeCtx = getCtx("place") ?? getCtx("locality");
  const postcodeCtx = getCtx("postcode");

  let state: string | null = null;
  const sc = region?.short_code as string | undefined;
  if (sc && /^AU-/.test(sc)) state = sc.slice(3).toUpperCase();
  else if (region?.text) state = String(region.text).toUpperCase();

  const types: string[] = Array.isArray(f?.place_type) ? f.place_type : [];
  const isPlaceLike = types.includes("place") || types.includes("locality");
  const isPostcode = types.includes("postcode");

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

/** Find the best postcode for a given suburb/state (tries name+state first, then proximity). */
async function postcodeForPlace(
  suburb: string | null,
  state: string | null,
  center?: [number, number]
): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;

  // Try "postcode" by name, filter by state
  if (suburb) {
    const byName = await geocode(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(suburb)}.json`,
      {
        access_token: MAPBOX_TOKEN,
        country: "AU",
        language: "en",
        types: "postcode",
        limit: "5",
        autocomplete: "true",
      }
    );
    const feats: any[] = byName?.features ?? [];
    const filtered = feats.filter((f) => {
      const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
      const region = ctx.find((c) => typeof c?.id === "string" && c.id.startsWith("region"));
      const sc = region?.short_code as string | undefined;
      const st = sc && /^AU-/.test(sc) ? sc.slice(3).toUpperCase() : (region?.text ? String(region.text).toUpperCase() : null);
      return state ? st === state : true;
    });
    if (filtered.length) {
      if (center) {
        let best = filtered[0];
        let bestD = Infinity;
        for (const f of filtered) {
          const c: [number, number] | undefined = Array.isArray(f?.center) ? f.center : undefined;
          if (!c) continue;
          const d = dist(center, c);
          if (d < bestD) { bestD = d; best = f; }
        }
        return String(best?.text ?? "") || null;
      }
      return String(filtered[0]?.text ?? "") || null;
    }
  }

  // Fallback: nearest postcode near center
  if (center) {
    const near = await geocode(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/postcode.json`,
      {
        access_token: MAPBOX_TOKEN,
        country: "AU",
        language: "en",
        types: "postcode",
        proximity: `${center[0]},${center[1]}`,
        limit: "1",
        autocomplete: "true",
      }
    );
    const f = near?.features?.[0];
    if (Array.isArray(f?.place_type) && f.place_type.includes("postcode")) {
      return String(f?.text ?? "") || null;
    }
  }

  return null;
}

/** Given a postcode feature and typed digits, return ONLY places whose nearest postcode equals those digits. */
async function placesForPostcodeStrict(
  fPostcode: any,
  digits: string,
  limit = 8
): Promise<Picked[]> {
  const center = fPostcode?.center as [number, number] | undefined;
  if (!center) return [];
  const { state } = parseAUFeature(fPostcode);

  // Get nearby place/locality candidates
  const json = await geocode(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/place.json`,
    {
      access_token: MAPBOX_TOKEN,
      country: "AU",
      language: "en",
      types: "place,locality",
      proximity: `${center[0]},${center[1]}`,
      limit: String(limit * 2), // ask for more; we will filter down
      autocomplete: "true",
    }
  );

  const feats: any[] = json?.features ?? [];
  const out: Picked[] = [];

  for (const pf of feats) {
    const parsed = parseAUFeature(pf);
    const pCenter: [number, number] | undefined = Array.isArray(pf?.center) ? pf.center : undefined;

    // Resolve the postcode for this place (using state+center) and require match
    const pPostcode = await postcodeForPlace(parsed.suburb, state ?? parsed.state, pCenter);
    if (!pPostcode || pPostcode !== digits) continue;

    const label = buildLabel(parsed.suburb, (parsed.state ?? state), pPostcode) || (pf?.place_name as string);
    out.push({
      label,
      suburb: parsed.suburb ?? null,
      state: (parsed.state ?? state) ?? null,
      postcode: pPostcode,
    });

    if (out.length >= limit) break;
  }

  // de-dup by label
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.label) ? false : (seen.add(i.label), true)));
}

/* ------------------------------ component ------------------------------ */

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

        // If the user typed an AU postcode (exact 4 digits), lock results to places that actually resolve to that postcode.
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
            const strict = await placesForPostcodeStrict(pcFeature, q, 8);
            setItems(strict);
            setActiveIndex(strict.length ? 0 : -1);
            setOpen(isFocused && strict.length > 0);
            return;
          }
        }

        // Generic search: place/locality/postcode
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

        // Map and enrich a few items with missing postcodes
        const prelim = feats.map((f) => {
          const parsed = parseAUFeature(f);
          const center: [number, number] | undefined = Array.isArray(f?.center) ? f.center : undefined;
          return { f, parsed, center };
        });

        const ENRICH_N = 6;
        for (let i = 0, enriched = 0; i < prelim.length && enriched < ENRICH_N; i++) {
          const p = prelim[i];
          const types: string[] = Array.isArray(p.f?.place_type) ? p.f.place_type : [];
          const isPlace = types.includes("place") || types.includes("locality");
          if (!isPlace) continue;
          if (!p.parsed.postcode) {
            p.parsed.postcode = await postcodeForPlace(p.parsed.suburb, p.parsed.state, p.center);
          }
          enriched++;
        }

        const mapped: Picked[] = prelim.map(({ parsed, f }) => {
          const label = buildLabel(parsed.suburb, parsed.state, parsed.postcode) || (f?.place_name as string);
          return {
            label,
            suburb: parsed.suburb ?? null,
            state: parsed.state ?? null,
            postcode: parsed.postcode ?? null,
          };
        });

        // De-dup; prefer ones with postcodes
        const bestByLabel = new Map<string, Picked>();
        for (const m of mapped) {
          const ex = bestByLabel.get(m.label);
          if (!ex) bestByLabel.set(m.label, m);
          else if (!ex.postcode && m.postcode) bestByLabel.set(m.label, m);
        }
        const unique = Array.from(bestByLabel.values());

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
    setQuery(it.label);   // "Epping, VIC 3076"
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
