// components/NavAuth.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type NavAuthProps = {
  variant?: "inline" | "menu"; // accepted for backwards compatibility
  currentPath?: string;        // accepted for backwards compatibility
};

export default function NavAuth(_props: NavAuthProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ignore) setUserId(user?.id ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        if (!ignore) setUserId(session?.user?.id ?? null);
      });
      return () => sub.subscription.unsubscribe();
    })();
    return () => { ignore = true; };
  }, []);

  if (!userId) {
    return (
      <a href="/signin" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </a>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <>
      <a href="/myposts" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        My posts
      </a>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign out
      </button>
    </>
  );
}
