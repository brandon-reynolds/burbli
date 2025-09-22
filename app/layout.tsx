// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* Header: tighter on mobile, no tagline, nicer logo, mobile menu */}
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
            {/* Brand */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-sm grid place-items-center">
                <span className="text-white font-bold text-base md:text-lg leading-none">B</span>
              </div>
              <span className="font-semibold text-base md:text-lg tracking-tight">Burbli</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Home</Link>
              <Link href="/feed" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Browse jobs</Link>
              <Link href="/submit" className="px-3 py-2 rounded-xl text-sm bg-gray-900 text-white">Share your job</Link>
              <NavAuth variant="inline" />
            </nav>

            {/* Mobile menu */}
            <details className="relative md:hidden">
              <summary className="list-none [&::-webkit-details-marker]:hidden p-2 rounded-lg border hover:bg-gray-50 cursor-pointer">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-gray-900">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Open menu</span>
              </summary>

              <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg overflow-hidden">
                <div className="flex flex-col p-2">
                  <Link href="/" className="px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Home</Link>
                  <Link href="/feed" className="px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Browse jobs</Link>
                  <Link href="/submit" className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white">Share your job</Link>
                  {/* Auth-aware items for mobile */}
                  <NavAuth variant="menu" />
                </div>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>

        <footer className="mt-16 border-t">
          <div className="mx-auto max-w-6xl p-6 text-xs text-gray-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} Burbli — Made in Melbourne</div>
            <div className="flex gap-4">
              <a className="underline" href="/privacy">Privacy</a>
              <a className="underline" href="/terms">Terms</a>
              <a className="underline" href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
