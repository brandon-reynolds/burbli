// components/NavAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type NavAuthProps = {
  onAction?: () => void; // optional hook to close mobile sheet
};

export default function NavAuth({ onAction }: NavAuthProps) {
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

  const after = () => { try { onAction?.(); } catch {} };

  if (!userId) {
    return (
      <Link href="/signin" onClick={after} className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign in
      </Link>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    after();
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <>
      <Link href="/myposts" onClick={after} className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        My posts
      </Link>
      <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">
        Sign out
      </button>
    </>
  );
}
