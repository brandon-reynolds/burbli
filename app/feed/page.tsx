"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <FeedInner />
    </Suspense>
  );
}

function FeedInner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (!ignore) {
        if (error) console.error(error);
        setJobs((data ?? []) as Job[]);
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const id = params.get("id");
    if (!id || jobs.length === 0) return;
    setSelected(jobs.find(j => j.id === id) ?? null);
  }, [params, jobs]);

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        {loading && <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}
        {!loading && jobs.map(j => (
          <button
            key={j.id}
            onClick={() => {
              setSelected(j);
              router.push(`/feed?id=${j.id}`, { scroll: false });
            }}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected?.id === j.id ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">{j.title || "Untitled"}</div>
            <div className="text-sm text-gray-500">
              {j.business_name ? `${j.business_name} • ` : ""}{j.suburb}, {j.state} {j.postcode}
            </div>
          </button>
        ))}
        {!loading && jobs.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">No jobs yet.</div>
        )}
      </div>

      <div className="hidden lg:block lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <JobDetailCard job={selected} />
        </div>
      </div>
    </section>
  );
}
