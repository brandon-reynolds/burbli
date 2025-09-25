// app/post/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";
import JobDetailCard from "@/components/JobDetailCard";

export default function PublicJobPage() {
  const { id } = useParams<{ id: string }>() ?? { id: "" };
  const search = useSearchParams();
  const fromParam = search.get("from"); // encoded path like "/feed?q=...&state=...&rec=1"

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

  const browseHref = useMemo(() => {
    if (!fromParam) return "/feed";
    const decoded = decodeURIComponent(fromParam);
    return decoded.startsWith("/") ? decoded : "/feed";
  }, [fromParam]);

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-gray-600">
          <li>
            <Link href="/" className="hover:underline">Home</Link>
          </li>
          <li aria-hidden="true" className="px-1">/</li>
          <li>
            <Link href={browseHref} className="hover:underline">Browse jobs</Link>
          </li>
          <li aria-hidden="true" className="px-1">/</li>
          <li className="text-gray-900 font-medium truncate max-w-[60vw] md:max-w-none">
            {(job?.title ?? "Job").trim() || "Job"}
          </li>
        </ol>
      </nav>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
      ) : (
        <div className="max-w-3xl">
          <JobDetailCard job={job} />
        </div>
      )}
    </main>
  );
}
