// app/submit/page.tsx
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
      if (!user) window.location.href = "/signin";
      else setUserId(user.id);
    })();
  }, []);

  if (!userId) return null;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Share your project</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tell neighbours about work you’ve <span className="font-medium">already had done</span> — whether
          you’d recommend the tradie/business or not.
        </p>
      </header>

      <JobForm onCreated={(j) => setCreated(j)} />

      {created && (
        <div className="mt-6 rounded-xl border bg-green-50 text-green-900 p-4 text-sm">
          Thanks for sharing! View it in <a className="underline" href="/myposts">My posts</a> or{" "}
          <a className="underline" href="/feed">browse the feed</a>.
        </div>
      )}
    </section>
  );
}
