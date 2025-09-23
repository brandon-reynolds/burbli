export type CostType = "exact" | "range" | "na" | null | undefined;

export type Job = {
  id: string;
  owner_id: string | null;
  created_at: string | null;

  title: string | null;
  business_name: string | null;

  suburb: string;
  state: string;
  postcode: string;

  recommend: boolean | null;

  cost_type: CostType;
  cost_exact?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;

  notes?: string | null;
};
