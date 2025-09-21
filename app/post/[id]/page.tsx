// app/post/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

function fmtAud(c?: number | null) {
  return c == null
    ? ""
    : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
        c / 100
      );
}

async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("is_approved", true)
    .maybeSingle();

  if (error) return null;
  return (data as Job) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return { title: "Post not found • Burbli" };
  }

  const title = `${job.title} — ${job.suburb}, ${job.state} ${job.postcode}`;
  const description = [
    job.business_name ? `Done by ${job.business_name}` : "",
    job.recommend ? "Recommended" : "Not recommended",
    job.cost_type === "exact"
      ? `Cost ${fmtAud(job.cost_amount)}`
      : job.cost_type === "range"
      ? `Cost ${fmtAud(job.cost_min)}–${fmtAud(job.cost_max)}`
      : "Cost hidden",
  ]
    .filter(Boolean)
    .join(" • ");

  const url = `https://burbli.vercel.app/post/${job.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Burbli",
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PostPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <article className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">{job.title}</h1>
        <span
          className={`text-xs px-2 py-1 rounded ${
            job.recommend ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {job.recommend ? "Recommended" : "Not recommended"}
        </span>
      </header>

      <div className="mt-2 text-sm text-gray-600">
        {job.suburb}, {job.state} {job.postcode}
      </div>
      <div className="mt-1 text-sm">
        Done by <span className="font-medium">{job.business_name}</span>
      </div>
      {job.cost_type !== "hidden" && (
        <div className="mt-1 text-sm">
          Cost:{" "}
          <span className="font-medium">
            {job.cost_type === "exact"
              ? fmtAud(job.cost_amount)
              : `${fmtAud(job.cost_min)}–${fmtAud(job.cost_max)}`}
          </span>
        </div>
      )}
      {job.notes && <p className="mt-3 text-sm text-gray-700">{job.notes}</p>}

      <footer className="mt-6 flex items-center justify-between text-xs text-gray-500">
        <time dateTime={job.created_at}>
          Posted {new Date(job.created_at).toLocaleDateString()}
        </time>
        <a
          className="underline"
          href={`https://burbli.vercel.app/post/${job.id}`}
          target="_blank"
        >
          Open link
        </a>
      </footer>
    </article>
  );
}
