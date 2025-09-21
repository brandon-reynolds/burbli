"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  async function sendLink() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert("Enter a valid email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL },
    });
    if (error) alert(error.message);
    else setSent(email);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600 mt-1">We’ll email you a one-time sign-in link.</p>

      <input
        className="w-full mt-4 border rounded-xl px-3 py-2"
        placeholder="you@example.com"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />
      <button onClick={sendLink} className="mt-3 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black">
        Send magic link
      </button>

      {sent && <p className="text-sm text-green-700 mt-3">Magic link sent to {sent}</p>}
    </div>
  );
}
