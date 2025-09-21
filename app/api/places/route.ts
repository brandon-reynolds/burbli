// app/api/places/route.ts
import { NextResponse } from "next/server";

const API = "https://maps.googleapis.com/maps/api/place";
const COUNTRY = "au";

// Map long state names to abbreviations
const STATE_ABBR: Record<string, "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT"> = {
  "Victoria": "VIC",
  "New South Wales": "NSW",
  "Queensland": "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  "Tasmania": "TAS",
  "Australian Capital Territory": "ACT",
  "Northern Territory": "NT",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  const q = url.searchParams.get("q");
  const placeId = url.searchParams.get("place_id");

  try {
    if (q) {
      // Suggest localities within Australia
      const res = await fetch(
        `${API}/autocomplete/json?input=${encodeURIComponent(q)}&types=(regions)&components=country:${COUNTRY}&key=${key}`,
        { next: { revalidate: 60 } }
      );
      const data = await res.json();
      const predictions = (data?.predictions ?? []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
      }));
      return NextResponse.json({ predictions });
    }

    if (placeId) {
      // Get address components for the chosen prediction
      const res = await fetch(
        `${API}/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_component,name&key=${key}`,
        { next: { revalidate: 60 } }
      );
      const data = await res.json();
      const comps: any[] = data?.result?.address_components ?? [];

      const get = (type: string) =>
        comps.find((c) => (c.types as string[]).includes(type));

      // Try locality first, fallback to postal_town/sublocality
      const suburbComp =
        get("locality") ||
        get("postal_town") ||
        get("sublocality") ||
        get("sublocality_level_1");

      const stateComp = get("administrative_area_level_1");
      const pcComp = get("postal_code");

      const stateLong = stateComp?.long_name ?? "";
      const state =
        STATE_ABBR[stateLong] ??
        (stateComp?.short_name as any) ??
        "";

      return NextResponse.json({
        suburb: suburbComp?.long_name ?? "",
        state,
        postcode: pcComp?.long_name ?? "",
      });
    }

    return NextResponse.json({ predictions: [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
