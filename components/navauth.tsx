"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// email === undefined  -> loading (render nothing to avoid flicker)
// email === null       -> signed out
// email is string      -> signed in
export default function NavAuth() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    // initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setEmail(user?.email ?? null);
    });

    // live updates on sign in/out
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (email === undefined) {
    // loading: render nothing in nav slot (no flicker)
    return null;
  }

  if (email === null) {
    // signed out
    return (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  // signed in
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/"; // refresh UI
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/myposts" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        My posts
      </Link>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm border hover:bg-gray-50">
        Sign out
      </button>
    </div>
  );
}
