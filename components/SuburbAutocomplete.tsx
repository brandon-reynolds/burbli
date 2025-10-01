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
        url.searchParams.set("types", "place,locality,postcode");
        url.searchParams.set("limit", "8");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();

        const next: Picked[] = (json?.features ?? []).map((f: any) => {
          const suburb = (f?.text ?? null) as string | null;

          const ctx: any[] = Array.isArray(f?.context) ? f.context : [];
          const region = ctx.find((c) => typeof c.id === "string" && c.id.startsWith("region"));
          const postcode = ctx.find((c) => typeof c.id === "string" && c.id.startsWith("postcode"));

          let state: string | null = null;
          const sc = region?.short_code as string | undefined;
          if (sc && /^AU-/.test(sc)) state = sc.slice(3).toUpperCase();
          else if (region?.text) state = String(region.text).toUpperCase();

          const pc = postcode?.text ? String(postcode.text) : null;

          // ✅ Always build label as "Suburb, STATE POSTCODE"
          const labelBits = [suburb, state, pc].filter(Boolean).join(", ");
          return {
            label: labelBits,
            suburb,
            state,
            postcode: pc,
          } as Picked;
        });

        // De-dup by label
        const seen =
