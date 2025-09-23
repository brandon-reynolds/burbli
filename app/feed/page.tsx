"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";

type Job = {
  id: string;
  created_at: string;
  title: string;
  business_name: string;
  suburb: string;
  state: string;
  postcode: string;
  recommend: boolean;
  cost_type: string;
  cost?: number;
  cost_min?: number;
  cost_max?: number;
  notes?: string;
};

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
      if (error) console.error("Error loading jobs", error);
      else setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const handleSelect = (job: Job) => {
    setSelected(job);
    router.push(`/feed?id=${job.id}`, { scroll: false });
  };

  useEffect(() => {
    const id = params.get("id");
    if (id && jobs.length > 0) {
      const found = jobs.find((j) => j.id === id);
      if (found) setSelected(found);
    }
  }, [params, jobs]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left side list */}
      <div className="lg:col-span-5 space-y-4">
        {loading && <div>Loading...</div>}
        {!loading &&
          jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => handleSelect(job)}
              className={`cursor-pointer rounded-2xl border p-4 ${
                selected?.id === job.id
                  ? "border-blue-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold">{job.title}</div>
              <div className="text-sm text-gray-500">
                {job.business_name} — {job.suburb}, {job.state} {job.postcode}
              </div>
            </div>
          ))}
      </div>

      {/* Right side detail */}
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
