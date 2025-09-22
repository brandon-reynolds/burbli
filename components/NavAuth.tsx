"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) setEmail(data.user.email ?? null);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    // Keep it simple: bounce to home after signing out
    window.location.href = "/";
  }

  // While loading, just show the Sign in link so the layout doesn’t jump around
  if (loading) {
    return (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  if (!email) {
    return (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link href="/myposts" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        My posts
      </Link>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm border hover:bg-gray-50">
        Sign out
      </button>
    </>
  );
}
