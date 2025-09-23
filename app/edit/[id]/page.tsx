// app/edit/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobForm from "@/components/JobForm";
import type { Job } from "@/types";

export default function EditJobPage() {
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: auth }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("jobs").select("*").eq("id", id).single(),
      ]);
      setOwnerId(auth?.user?.id ?? null);
      if (!error) setJob((data ?? null) as Job | null);
      setLoading(false);
    })();
  }, [id]);

  if (!id) return null;
  if (loading) return null;

  if (!job) {
    return <div className="rounded-2xl border bg-white p-6">Not found.</div>;
  }

  if (!ownerId || job.owner_id !== ownerId) {
    return <div className="rounded-2xl border bg-white p-6">You can only edit your own post.</div>;
  }

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Edit your project</h1>
      <JobForm mode="update" initial={job} onSaved={() => (window.location.href = "/feed")} />
    </section>
  );
}
