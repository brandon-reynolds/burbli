"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setEmail(user?.email ?? null);
    });

    // live updates (sign in/out)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!email) {
    return (
      <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/"; // reset UI
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
