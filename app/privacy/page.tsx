// app/privacy/page.tsx
export default function Privacy() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p>
        We use your email only for passwordless sign-in. We don’t sell, rent, or
        share your data with third parties.
      </p>

      <h2 className="text-xl font-semibold mt-6">What we collect</h2>
      <ul className="list-disc ml-6 space-y-1">
        <li>Your email (for sign-in).</li>
        <li>
          Job posts you submit: title, suburb, state, postcode, who did the job,
          whether you recommend them, optional cost/notes.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">How we use it</h2>
      <ul className="list-disc ml-6 space-y-1">
        <li>Authenticate you and show your own posts.</li>
        <li>Display approved posts to other visitors.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">Data retention</h2>
      <p>You can delete your posts anytime from <strong>My posts</strong>.</p>

      <h2 className="text-xl font-semibold mt-6">Contact</h2>
      <p>
        Email us at{" "}
        <a className="underline" href="mailto:hello@burbli.example">
          hello@burbli.example
        </a>.
      </p>

      <p className="text-sm text-gray-500">
        Last updated {new Date().toLocaleDateString()}
      </p>
    </section>
  );
}
