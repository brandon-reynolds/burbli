"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!email) {
    return <Link href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Sign in</Link>;
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/myposts" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">My posts</Link>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm border hover:bg-gray-50">Sign out</button>
    </div>
  );
}
