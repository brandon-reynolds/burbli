"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import JobForm from "@/components/JobForm";
import type { Job } from "@/types";

export default function SubmitPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [created, setCreated] = useState<Job | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace("/signin");
        return;
      }
      setUserId(user.id);
    })();
  }, []);

  if (!userId) return null;

  return (
    <section>
      <JobForm onCreated={(j) => setCreated(j)} />
      {created && (
        <div className="mt-6 rounded-xl border bg-green-50 text-green-900 p-4 text-sm">
          Thanks for sharing! View your post in <a className="underline" href="/myposts">My posts</a> or <a className="underline" href="/feed">see the feed</a>.
        </div>
      )}
    </section>
  );
}
