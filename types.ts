// types.ts — keep this in sync with Supabase `jobs` table

export type CostType = "exact" | "range" | "na" | null;

export type Job = {
  id: string;
  owner_id: string | null;
  created_at: string;

  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: number | null;

  recommend: boolean;
  notes: string | null;

  // cost fields (all nullable in DB)
  cost_type: CostType;
  cost: string | null;      // when cost_type === "exact"
  cost_min: string | null;  // when cost_type === "range"
  cost_max: string | null;  // when cost_type === "range"
};

// Optional helper types if you ever want them:
export type NewJobPayload = Omit<Job, "id" | "created_at">;
export type UpdateJobPayload = Partial<Omit<Job, "id" | "created_at" | "owner_id">>;
