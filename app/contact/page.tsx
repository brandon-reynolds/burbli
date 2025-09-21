// app/contact/page.tsx
export default function Contact() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Contact</h1>
      <p>Questions, takedowns, or feedback? We’d love to hear from you.</p>
      <p>
        Email:{" "}
        <a className="underline" href="mailto:hello@burbli.example">
          hello@burbli.example
        </a>
      </p>
    </section>
  );
}
