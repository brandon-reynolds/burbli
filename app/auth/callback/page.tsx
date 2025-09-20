"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const [status, setStatus] = useState("Completing sign-in…");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        setStatus("Signed in. Redirecting…");
        router.replace("/submit");
      } catch (e: any) {
        setStatus(e.message ?? "Something went wrong");
      }
    })();
  }, [router]);

  return <p className="p-6">{status}</p>;
}

