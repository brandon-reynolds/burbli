"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

export default function PublicJobPage() {
  const { id } = useParams<{ id: string }>() ?? { id: "" };
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (!ignore) {
        if (!error && data) setJob(data as Job);
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  if (loading) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
      >
        <span aria-hidden>‹</span> Back
      </button>

      <div className="max-w-3xl">
        <JobDetailCard job={job} />
      </div>
    </section>
  );
}
