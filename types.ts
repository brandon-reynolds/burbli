// types.ts
export type CostType = "exact" | "range" | "na" | null;

export interface Job {
  id: string;
  title: string | null;
  business_name: string | null;
  suburb: string | null;
  state: string | null;
  postcode: number | string | null;
  recommend: boolean | null;
  cost_type: CostType;
  cost: number | string | null;
  cost_min: number | string | null;
  cost_max: number | string | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string | null;

  /** NEW: when the job was actually done (yyyy-mm-dd) */
  done_at: string | null;
}
