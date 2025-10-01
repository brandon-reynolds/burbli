// components/SuburbAutocomplete.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  placeholder?: string;
  onPick: (place: { suburb?: string; state?: string; postcode?: string }) => void;
  className?: string;
};

type Suggestion = {
  id: string;
  place_name: string;
  text: string;
  properties?: {
    postcode?: string;
    short_code?: string;
  };
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

export default function SuburbAutocomplete({ label, placeholder, onPick, className }: Props) {
  const [query, setQuery] = useState(label || "");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?autocomplete=true&types=place,locality&country=AU&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
          { signal: controller.signal }
        );
        const data = await resp.json();
        setResults(data.features || []);
      } catch {
        // ignore aborted fetch
      }
    };

    fetchData();
    return () => controller.abort();
  }, [query]);

  function handlePick(s: Suggestion) {
    // Extract state and postcode
    let suburb = s.text;
    let state = "";
    let postcode = "";

    if (s.context) {
      for (const c of s.context) {
        if (c.id.startsWith("region")) {
          state = c.short_code ? c.short_code.replace("AU-", "") : c.text;
        }
        if (c.id.startsWith("postcode")) {
          postcode = c.text;
        }
      }
    }
    if (!postcode && s.properties?.postcode) {
      postcode = s.properties.postcode;
    }

    const label = [suburb, state, postcode].filter(Boolean).join(", ");
    setQuery(label);
    setResults([]);
    setOpen(false);
    onPick({ suburb, state, postcode });
  }

  return (
    <div className={clsx("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-xl border px-3 py-2"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {query && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          onClick={() => {
            setQuery("");
            setResults([]);
            onPick({ suburb: "", state: "", postcode: "" });
            inputRef.current?.focus();
          }}
        >
          ✕
        </button>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow">
          {results.map((s) => {
            let suburb = s.text;
            let state = "";
            let postcode = "";

            if (s.context) {
              for (const c of s.context) {
                if (c.id.startsWith("region")) {
                  state = c.short_code ? c.short_code.replace("AU-", "") : c.text;
                }
                if (c.id.startsWith("postcode")) {
                  postcode = c.text;
                }
              }
            }
            if (!postcode && s.properties?.postcode) {
              postcode = s.properties.postcode;
            }

            const label = [suburb, state, postcode].filter(Boolean).join(", ");

            return (
              <li
                key={s.id}
                onClick={() => handlePick(s)}
                className="cursor-pointer px-3 py-2 hover:bg-gray-100"
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
