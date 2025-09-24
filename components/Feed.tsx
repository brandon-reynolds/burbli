// components/JobForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

type Props = {
  /** Pass a job to edit. If omitted/null -> create mode */
  initial?: Job | null;
};

type FormState = {
  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: string;
  recommend: boolean | null;
  cost_type: "exact" | "range" | "from" | "" | null;
  cost: string; // keep as string for inputs; convert later
  cost_min: string;
  cost_max: string;
  notes: string;
};

function toMoneyNumber(s: string): number | null {
  if (!s) return null;
  // remove $ and commas/spa
