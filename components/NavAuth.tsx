// components/NavAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Props:
 * - variant: "inline" (desktop row) | "menu" (mobile dropdown)
 * - currentPath: used to highlight "My posts" when at /myposts
 * - onAction: optional callback (used on mobile to close menu after click)
 */
export default function NavAuth({
  variant = "inline",
  currentPath,
  onAction,
}: {
  variant?: "inline" | "menu";
  currentPath?: string;
  onAction?: () => void;
}) {
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
    onAction?.();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // class helpers
  const baseInline = "px-3 py-2 rounded-xl text-sm";
  const baseMenu = "px-3 py-2 rounded-lg text-sm";
  const active = "bg-gray-900 text-white";
  const hoverInline = "hover:bg-gray-100";
  const hoverMenu = "hover:bg-gray-50";
  const isActive = (p?: string) => currentPath === p;

  if (loading) {
    // deterministic placeholder to avoid layout shift
    return variant === "menu" ? (
      <Link href="/signin" className={`${baseMenu} ${hoverMenu}`}>Sign in</Link>
    ) : (
      <Link href="/signin" className={`${baseInline} ${hoverInline}`}>Sign in</Link>
    );
  }

  // Signed out
  if (!email) {
    return variant === "menu" ? (
      <Link
        href="/signin"
        onClick={() => onAction?.()}
        aria-current={isActive("/signin") ? "page" : undefined}
        className={[baseMenu, isActive("/signin") ? active : hoverMenu].join(" ")}
      >
        Sign in
      </Link>
    ) : (
      <Link
        href="/signin"
        aria-current={isActive("/signin") ? "page" : undefined}
        className={[baseInline, isActive("/signin") ? active : hoverInline].join(" ")}
      >
        Sign in
      </Link>
    );
  }

  // Signed in
  const myPostsLink =
    variant === "menu" ? (
      <Link
        href="/myposts"
        onClick={() => onAction?.()}
        aria-current={isActive("/myposts") ? "page" : undefined}
        className={[baseMenu, isActive("/myposts") ? active : hoverMenu].join(" ")}
      >
        My posts
      </Link>
    ) : (
      <Link
        href="/myposts"
        aria-current={isActive("/myposts") ? "page" : undefined}
        className={[baseInline, isActive("/myposts") ? active : hoverInline].join(" ")}
      >
        My posts
      </Link>
    );

  const signOutBtn =
    variant === "menu" ? (
      <button onClick={signOut} className={`${baseMenu} border ${hoverMenu} text-left`}>
        Sign out
      </button>
    ) : (
      <button onClick={signOut} className={`${baseInline} border ${hoverInline}`}>
        Sign out
      </button>
    );

  return variant === "menu" ? (
    <>
      {myPostsLink}
      {signOutBtn}
    </>
  ) : (
    <div className="flex items-center gap-2">
      {myPostsLink}
      {signOutBtn}
    </div>
  );
}
