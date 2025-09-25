// components/SiteHeader.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavAuth from "./NavAuth";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Close nav on route change and on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prevent background scroll only while open
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                BR
              </div>
              <span className="hidden sm:inline text-base font-semibold tracking-tight">Burbli</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-3 sm:flex">
            <Link
              href="/submit"
              className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Share project
            </Link>
            <Link
              href="/myposts"
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              My posts
            </Link>
            <NavAuth />
          </nav>

          {/* Mobile menu button */}
          <button
            className="sm:hidden rounded-lg border px-3 py-2 text-sm"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </div>
      </div>

      {/* Mobile drawer – only mounts when open */}
      {open && (
        <>
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-base font-semibold">Menu</span>
              <button
                className="rounded-lg border px-2 py-1 text-sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <nav className="flex flex-col gap-2 p-4">
              <Link
                href="/submit"
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                onClick={() => setOpen(false)}
              >
                Share project
              </Link>
              <Link
                href="/myposts"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                My posts
              </Link>
              <div className="pt-2">
                <NavAuth />
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
