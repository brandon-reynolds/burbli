// /types.ts
export type CostType = "exact" | "range" | "na" | null | undefined;

export type Job = {
  id: string;
  owner_id: string | null;
  created_at: string | null;

  title: string | null;
  business_name: string | null;

  suburb: string;
  state: string;    // e.g. "VIC"
  postcode: string; // stored as string to preserve leading zeroes

  recommend: boolean | null;

  cost_type: CostType;      // "exact" | "range" | "na" | null/undefined
  cost_exact?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;

  notes?: string | null;
};
