"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setEmail(sess?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/"; // back to home after sign out
  }

  // Not signed in → show “Sign in”
  if (!email) {
    return (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  // Signed in → show “My posts” + “Sign out”
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
