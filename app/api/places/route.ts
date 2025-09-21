// app/api/places/route.ts
import { NextResponse } from "next/server";

const API = "https://maps.googleapis.com/maps/api/place";
const COUNTRY = "au";

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
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const hasKey = Boolean(key);
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const placeId = url.searchParams.get("place_id");

  if (!hasKey) {
    return NextResponse.json(
      { ok: false, hasKey, where: "server", error: "Missing GOOGLE_MAPS_API_KEY" },
      { status: 500 }
    );
  }

  try {
    if (q) {
      const target = `${API}/autocomplete/json?input=${encodeURIComponent(
        q
      )}&components=country:${COUNTRY}&key=${key}`;
      const res = await fetch(target, { next: { revalidate: 15 } });
      const data = await res.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json(
          {
            ok: false,
            hasKey,
            phase: "autocomplete",
            google_status: data.status,
            google_error: data.error_message ?? null,
          },
          { status: 502 }
        );
      }

      const predictions = (data.predictions ?? []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description as string,
      }));
      return NextResponse.json({ ok: true, hasKey, predictions });
    }

    if (placeId) {
      const target = `${API}/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=address_component,name&key=${key}`;
      const res = await fetch(target, { next: { revalidate: 60 } });
      const data = await res.json();

      if (data.status !== "OK") {
        return NextResponse.json(
          {
            ok: false,
            hasKey,
            phase: "details",
            google_status: data.status,
            google_error: data.error_message ?? null,
          },
          { status: 502 }
        );
      }

      const comps: any[] = data.result?.address_components ?? [];
      const get = (t: string) => comps.find((c) => (c.types as string[]).includes(t));
      const suburbComp =
        get("locality") || get("postal_town") || get("sublocality") || get("sublocality_level_1");
      const stateComp = get("administrative_area_level_1");
      const pcComp = get("postal_code");

      const stateLong = stateComp?.long_name ?? "";
      const state =
        STATE_ABBR[stateLong] ?? (stateComp?.short_name as any) ?? "";

      return NextResponse.json({
        ok: true,
        hasKey,
        suburb: suburbComp?.long_name ?? "",
        state,
        postcode: pcComp?.long_name ?? "",
      });
    }

    return NextResponse.json({ ok: true, hasKey, predictions: [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, hasKey, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
