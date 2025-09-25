// app/post/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";
import type { Job } from "@/types";

type PageProps = { params: { id: string } };

export default function PostPage({ params }: PageProps) {
  const search = useSearchParams();
  const fromParam = search.get("from"); // encoded path like "/feed?..."; optional

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();
      if (!ignore) {
        if (error) {
          console.error(error);
          setJob(null);
        } else {
          setJob(data as Job);
        }
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [params.id]);

  const browseHref = useMemo(() => {
    const decoded = fromParam ? decodeURIComponent(fromParam) : "";
    return decoded && decoded.startsWith("/") ? decoded : "/feed";
  }, [fromParam]);

  const currentTitle = (job?.title ?? "Job").trim() || "Job";

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
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
            {currentTitle}
          </li>
        </ol>
      </nav>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
      ) : job ? (
        <JobDetailCard job={job} />
      ) : (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Post not found.</div>
      )}
    </main>
  );
}
