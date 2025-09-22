import "./globals.css";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto max-w-6xl flex items-center justify-between p-4 md:p-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">BR</div>
              <div>
                <h1 className="font-semibold text-lg">Burbli</h1>
                <p className="text-sm text-gray-500 -mt-1">Neighbourhood jobs & recommendations</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Home</Link>
              <Link href="/feed" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Browse jobs</Link>
              <Link href="/submit" className="px-3 py-2 rounded-xl text-sm bg-gray-900 text-white">Share your job</Link>
              <NavAuth variant="inline" />
            </nav>

            {/* Mobile menu (hamburger) */}
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
                  {/* Auth-aware items (stacked for menu) */}
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
