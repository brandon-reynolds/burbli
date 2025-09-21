import "./globals.css";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl flex items-center justify-between p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">BR</div>
              <div>
                <h1 className="font-semibold text-lg">Burbli</h1>
                <p className="text-sm text-gray-500 -mt-1">Neighbourhood jobs & recommendations</p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <Link href="/" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Home</Link>
              <Link href="/feed" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-100">Browse jobs</Link>
              <Link href="/submit" className="px-3 py-2 rounded-xl text-sm bg-gray-900 text-white">Share your job</Link>
              <NavAuth />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>

        <footer className="mt-16 border-t">
          <div className="mx-auto max-w-6xl p-6 text-xs text-gray-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} Burbli — Made in Melbourne</div>
            <div className="flex gap-4">
              <a className="underline" href="#">Privacy</a>
              <a className="underline" href="#">Terms</a>
              <a className="underline" href="#">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
