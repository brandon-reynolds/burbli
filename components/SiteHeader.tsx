// components/SiteHeader.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavAuth from "@/components/NavAuth";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href ? "bg-gray-900 text-white" : "hover:bg-gray-100";

  useEffect(() => {
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-4 md:p-6">
        {/* Brand -> home */}
        <a href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">BR</div>
          <div className="font-semibold text-lg">Burbli</div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <a href="/" className={`px-3 py-2 rounded-xl text-sm ${isActive("/")}`}>Home</a>
          <a href="/feed" className={`px-3 py-2 rounded-xl text-sm ${isActive("/feed")}`}>Browse jobs</a>
          <a href="/submit" className={`px-3 py-2 rounded-xl text-sm ${isActive("/submit")} bg-gray-900 text-white`}>
            Share project
          </a>
          <NavAuth />
        </nav>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-900" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          <span className="sr-only">Menu</span>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-nav" className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-6xl p-2">
            <a href="/" onClick={closeMenu} className={`block px-3 py-3 rounded-xl text-sm ${isActive("/")}`}>Home</a>
            <a href="/feed" onClick={closeMenu} className={`block px-3 py-3 rounded-xl text-sm ${isActive("/feed")}`}>Browse jobs</a>
            <a href="/submit" onClick={closeMenu} className={`block px-3 py-3 rounded-xl text-sm ${isActive("/submit")} bg-gray-900 text-white`}>Share project</a>
            <div className="mt-1 border-t pt-2">
              <NavAuth onAction={closeMenu} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
