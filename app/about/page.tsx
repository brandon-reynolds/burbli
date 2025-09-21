// app/about/page.tsx
export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">About Burbli</h1>
      <p>
        Burbli is a simple, community project for sharing real home jobs across
        Australia—what was done, roughly what it cost (optional), where it was,
        and whether you’d recommend the tradie or business.
      </p>
      <p>
        The aim is transparency and neighbour-to-neighbour help. We show suburb,
        state and postcode only (no street addresses). You can edit or delete
        your own posts at any time.
      </p>
      <p>
        Ideas or issues? Email{" "}
        <a className="underline" href="mailto:hello@burbli.example">
          hello@burbli.example
        </a>
        .
      </p>
    </section>
  );
}
