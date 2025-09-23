// components/SiteNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NavAuth from "@/components/NavAuth";

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (path: string) => pathname === path;

  const desktopLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={[
        "px-3 py-2 rounded-xl text-sm",
        isActive(href) ? "bg-gray-900 text-white" : "hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );

  const mobileLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      onClick={() => setOpen(false)}
      aria-current={isActive(href) ? "page" : undefined}
      className={[
        "px-3 py-2 rounded-lg text-sm",
        isActive(href) ? "bg-gray-900 text-white" : "hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-2">
        {desktopLink("/", "Home")}
        {desktopLink("/feed", "Browse jobs")}
        {desktopLink("/submit", "Post job")}
        <NavAuth variant="inline" currentPath={pathname} />
      </nav>

      {/* Mobile nav */}
      <div className="relative md:hidden" ref={menuRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg border hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-gray-900">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Toggle menu</span>
        </button>

        {open && (
          <div id="mobile-menu" className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg overflow-hidden z-50">
            <div className="flex flex-col p-2">
              {mobileLink("/", "Home")}
              {mobileLink("/feed", "Browse jobs")}
              {mobileLink("/submit", "Post job")}
              <NavAuth variant="menu" currentPath={pathname} onAction={() => setOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
