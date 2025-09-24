// app/edit/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobForm from "@/components/JobForm";
import type { Job } from "@/types";

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return (window.location.href = "/signin");
      const { data, error } = await supabase.from("jobs").select("*").eq("id", params.id).single();
      if (error || !data) {
        alert("Could not load job.");
        return router.replace("/myposts");
      }
      if (data.owner_id !== auth.user.id) {
        alert("You can only edit your own posts.");
        return router.replace("/myposts");
      }
      if (!ignore) {
        setJob(data as Job);
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [params.id, router]);

  if (loading) return null;

  return (
    <section className="mx-auto max-w-3xl p-4 md:p-8">
      <h1 className="text-2xl font-semibold mb-4">Edit project</h1>
      <JobForm
        initialJob={job}
        onSaved={(j) => router.push(`/post/${j.id}`)}
        submitLabel="Save changes"
      />
    </section>
  );
}
