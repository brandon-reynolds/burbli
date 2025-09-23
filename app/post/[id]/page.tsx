// app/post/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";

type Job = {
  id: string;
  title: string;
  business_name: string | null;
  suburb: string;
  state: "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT";
  postcode: string;
  recommend: boolean;
  cost_type: "exact" | "range" | "hidden";
  cost_amount?: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  notes?: string | null;
  created_at: string;
};

export default function PublicPostPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || "";
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,business_name,suburb,state,postcode,recommend,cost_type,cost_amount,cost_min,cost_max,notes,created_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (!ignore) {
        if (!error && data) setJob(data as Job);
        setLoading(false);
      }
    }
    if (id) load();
    return () => {
      ignore = true;
    };
  }, [id]);

  function goBack() {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/feed";
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="mt-4 h-7 w-2/3 bg-gray-200 rounded animate-pulse" />
        <div className="mt-6 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        <div className="mt-3 h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-gray-700">This job could not be found.</div>
        <a href="/feed" className="mt-3 inline-block text-sm underline">
          Back to browse
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile back bar */}
      <div className="md:hidden">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 border hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Detail card (public variant = smaller CTAs under a divider) */}
      <JobDetailCard job={job} variant="public" />
    </div>
  );
}
