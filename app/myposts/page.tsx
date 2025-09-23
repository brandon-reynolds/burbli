// app/myposts/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

export default function MyPostsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Require auth
  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== "undefined") window.location.href = "/signin";
        return;
      }
      if (ignore) return;
      setUserId(user.id);

      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) {
          console.error(error);
          setItems([]);
        } else {
          setItems((data ?? []) as Job[]);
        }
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  if (!userId) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My posts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Projects you’ve shared on Burbli.
          </p>
        </div>
        <Link
          href="/submit"
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Share a project
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-gray-700">You haven’t shared any projects yet.</p>
          <Link href="/submit" className="mt-3 inline-block underline">
            Share your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((j) => (
            <Link
              key={j.id}
              href={`/post/${j.id}`}
              className="rounded-2xl border bg-white p-4 hover:border-gray-300"
            >
              <div className="font-medium line-clamp-2">{j.title || "Untitled"}</div>
              <div className="mt-1 text-sm text-gray-600">
                {j.business_name ? `${j.business_name} • ` : ""}
                {j.suburb}, {j.state} {j.postcode}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
