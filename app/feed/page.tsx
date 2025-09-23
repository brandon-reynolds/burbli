"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";
import type { Job } from "@/types"; // ← use the shared Job type

export default function FeedPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading jobs", error);
        setJobs([]);
      } else {
        // Trust the shared Job shape
        setJobs((data ?? []) as Job[]);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const handleSelect = (job: Job) => {
    setSelected(job);
    router.push(`/feed?id=${job.id}`, { scroll: false });
  };

  // Sync selection from ?id= on first load / navigation
  useEffect(() => {
    const id = params.get("id");
    if (id && jobs.length > 0) {
      const found = jobs.find((j) => j.id === id) || null;
      setSelected(found);
    }
  }, [params, jobs]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: list */}
      <div className="lg:col-span-5 space-y-4">
        {loading && <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>}
        {!loading &&
          jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => handleSelect(job)}
              className={`w-full text-left rounded-2xl border p-4 focus:outline-none ${
                selected?.id === job.id
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold truncate">{job.title || "Untitled"}</div>
              <div className="text-sm text-gray-500 truncate">
                {job.business_name ? `${job.business_name} — ` : ""}
                {job.suburb}, {job.state} {job.postcode}
              </div>
            </button>
          ))}
        {!loading && jobs.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">No jobs yet.</div>
        )}
      </div>

      {/* Right: detail */}
      <div className="hidden lg:block lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          {selected ? (
            <JobDetailCard job={selected} />
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">
              Select a job on the left to view details.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
