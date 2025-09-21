import Link from "next/link";

export default function HomePage() {
  return (
    <section className="p-8">
      <h1 className="text-3xl font-semibold">Burbli</h1>
      <p className="mt-2 text-gray-600">
        See real jobs. Share yours. Help your neighbours.
      </p>

      <div className="mt-6 flex gap-3">
        <Link href="/submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white">Share your job</Link>
        <Link href="/feed" className="px-4 py-2 rounded-xl border">Browse jobs</Link>
        <Link href="/signin" className="px-4 py-2 rounded-xl border">Sign in</Link>
      </div>
    </section>
  );
}
