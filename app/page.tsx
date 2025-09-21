import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-[1px]">
        <div className="rounded-3xl bg-white p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              See real jobs. Share yours. Help your neighbours.
            </h2>
            <p className="mt-3 text-gray-600">
              Crowdsourced transparency on home jobs across Australia. Costs optional.
              We show suburb, state and postcode only.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black">Share your job</Link>
              <Link href="/feed" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Browse jobs</Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              No ads. No tracking. Your email is used only to sign in and show your posts.
            </p>
          </div>

          <div className="border rounded-2xl p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Job example</span>
              <span className="text-xs text-gray-500">2m ago</span>
            </div>
            <h3 className="mt-2 font-medium">Roof insulation replacement (R5.0)</h3>
            <div className="text-sm text-gray-600">Epping, VIC 3076</div>
            <div className="text-sm">Done by <span className="font-medium">No Gap Insulation</span> • <span className="text-green-600">Recommended ✓</span></div>
            <div className="text-sm">Cost: <span className="font-medium">$3,899.99</span></div>
            <p className="text-sm text-gray-600 mt-1">Old loose-fill removed, new batts installed in 1 day.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
