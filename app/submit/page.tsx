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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) window.location.href = "/signin";
      else setUserId(user.id);
    })();
  }, []);

  if (!userId) return null;

  return (
    <section className="mx-auto max-w-5xl p-4 md:p-8">
      {/* Just the form; headings live inside the card itself */}
      <JobForm onCreated={(j) => setCreated(j)} />

      {created && (
        <div className="mt-6 rounded-xl border bg-green-50 text-green-900 p-4 text-sm">
          Thanks for sharing! View it in{" "}
          <a className="underline" href="/myposts">
            My posts
          </a>{" "}
          or{" "}
          <a className="underline" href="/feed">
            browse jobs
          </a>
          .
        </div>
      )}
    </section>
  );
}
