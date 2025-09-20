export type Job = {
  id: string;
  owner_id: string;
  title: string;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  business_name: string;
  recommend: boolean;
  cost_type: "exact"|"range"|"hidden";
  cost_amount?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};


