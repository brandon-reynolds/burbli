// app/feed/error.tsx
"use client";

export default function FeedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Something went wrong loading Browse jobs</h2>
      <p className="mt-2 text-sm text-gray-600">
        {error?.message || "A client-side error occurred."}
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-gray-900 px-4 py-2 text-white"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/feed")}
          className="rounded-xl border px-4 py-2"
        >
          Reload /feed
        </button>
      </div>
    </div>
  );
}
