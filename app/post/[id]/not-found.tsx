// app/post/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Post not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        This job either doesn’t exist or isn’t approved for public viewing.
      </p>
    </div>
  );
}
