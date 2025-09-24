// app/myposts/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

export default function MyPostsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function remove(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert(error.message || "Could not delete.");
      return;
    }
    setItems(prev => prev.filter(j => j.id !== id));
  }

  if (!userId) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My posts</h1>
          <p className="mt-1 text-sm text-gray-600">Projects you’ve shared on Burbli.</p>
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
            <div
              key={j.id}
              className="rounded-2xl border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/post/${j.id}`} className="font-medium line-clamp-2 hover:underline">
                    {j.title || "Untitled"}
                  </Link>
                  <div className="mt-1 text-sm text-gray-600">
                    {j.business_name ? `${j.business_name} • ` : ""}
                    {j.suburb}, {j.state} {j.postcode}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/edit/${j.id}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => remove(j.id)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
