export default function Terms() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Terms of Use</h1>
      <p>
        Burbli is community-submitted information. We make no guarantees and content may be moderated or removed.
      </p>
      <ul className="list-disc ml-6 space-y-1">
        <li>Be truthful and respectful. No personal addresses, phone numbers, or doxxing.</li>
        <li>Only post work you’ve had done yourself.</li>
        <li>We may remove posts that breach these terms or applicable law.</li>
      </ul>
      <p className="text-sm text-gray-500">Last updated {new Date().toLocaleDateString()}</p>
    </section>
  );
}
