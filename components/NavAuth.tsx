// components/NavAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * variant="inline" -> desktop header row
 * variant="menu"   -> stacked items in the mobile dropdown
 */
export default function NavAuth({ variant = "inline" }: { variant?: "inline" | "menu" }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user && mounted) setEmail(data.user.email ?? null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // While loading, show Sign in to avoid layout jump
  if (loading || !email) {
    return variant === "menu" ? (
      <Link href="/signin" className="px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Sign in</Link>
    ) : (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Sign in</Link>
    );
  }

  // Signed in
  return variant === "menu" ? (
    <>
      <Link href="/myposts" className="px-3 py-2 rounded-lg text-sm hover:bg-gray-50">My posts</Link>
      <button onClick={signOut} className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 text-left">
        Sign out
      </button>
    </>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/myposts" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">My posts</Link>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm border hover:bg-gray-50">
        Sign out
      </button>
    </div>
  );
}
