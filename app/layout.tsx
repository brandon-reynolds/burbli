// app/layout.tsx
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SiteHeader />
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
