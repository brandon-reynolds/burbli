"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";

type Job = {
  id: string;
  created_at: string;
  title: string | null;
  who: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  recommended: boolean | null;
  cost_text: string | null;
  notes: string | null;
};

export default function PublicJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!params?.id) return;
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();
      if (!ignore) {
        if (!error) setJob(data as Job);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [params?.id]);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
      >
        <span aria-hidden>‹</span> Back
      </button>

      {/* Only the card — no duplicate page header */}
      {job && <JobDetailCard job={job} />}
    </div>
  );
}
