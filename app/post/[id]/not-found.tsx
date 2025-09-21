export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Post not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        That job might have been removed or the link is incorrect.
      </p>
      <a href="/feed" className="inline-block mt-4 px-3 py-2 rounded-xl border text-sm">
        Back to feed
      </a>
    </div>
  );
}
