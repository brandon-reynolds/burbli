// app/terms/page.tsx
export default function Terms() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Terms of Use</h1>
      <p>
        Burbli is community-submitted information. We do not guarantee accuracy.
        Content may be moderated or removed at our discretion.
      </p>

      <h2 className="text-xl font-semibold mt-6">Rules</h2>
      <ul className="list-disc ml-6 space-y-1">
        <li>Post only work you personally had done.</li>
        <li>Keep posts truthful, helpful, and respectful.</li>
        <li>No personal addresses, phone numbers, or doxxing.</li>
        <li>No illegal, hateful, or defamatory content.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">Liability</h2>
      <p>
        You use Burbli at your own risk. We’re not responsible for decisions made
        from information on the site.
      </p>

      <p className="text-sm text-gray-500">
        Last updated {new Date().toLocaleDateString()}
      </p>
    </section>
  );
}
