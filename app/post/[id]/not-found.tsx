export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Post not found</h1>
      <p className="text-sm text-gray-600 mt-2">
        This post doesn’t exist or hasn’t been approved yet.
      </p>
    </div>
  );
}
