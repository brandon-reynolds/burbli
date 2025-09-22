"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setEmail(user?.email ?? null);
    })();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    // Refresh UI so the header re-renders immediately
    window.location.href = "/";
  }

  // While checking session, render nothing (avoids flicker)
  if (email === null) {
    return (
      <Link
        href="/signin"
        className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/myposts"
        className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100"
      >
        My posts
      </Link>
      <button
        onClick={signOut}
        className="px-3 py-2 rounded-xl text-sm border hover:bg-gray-50"
      >
        Sign out
      </button>
    </div>
  );
}
