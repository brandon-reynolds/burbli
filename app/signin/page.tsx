"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce to /submit
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace("/submit");
    })();
  }, [router]);

  async function sendLink() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert("Enter a valid email");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL },
    });
    setBusy(false);
    if (error) return alert(error.message);
    setSentTo(email);
  }

  async function verifyCode() {
    if (!email || !code.trim()) return alert("Enter your email and the code");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email", // verifies the 6-digit code from the email on THIS device
    });
    setBusy(false);
    if (error) return alert(error.message);
    router.replace("/submit");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border p-6 bg-white">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600 mt-1">
        We’ll email you a one-time link <span className="whitespace-nowrap">and code</span>.
      </p>

      <label className="block text-sm font-medium mt-4">Email</label>
      <input
        className="w-full mt-1 border rounded-xl px-3 py-2"
        placeholder="you@example.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={sendLink}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send email"}
        </button>
        {sentTo && (
          <span className="text-xs text-gray-500 self-center">
            Email sent to <b>{sentTo}</b>
          </span>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-gray-50 p-4">
        <div className="text-sm font-medium mb-2">Or enter the code</div>
        <p className="text-xs text-gray-600 mb-2">
          Open the email on any device, then type the 6-digit code here to finish sign-in on this device.
        </p>
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <button
          onClick={verifyCode}
          disabled={busy}
          className="mt-3 px-4 py-2 rounded-xl border disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Verify code"}
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        By continuing you agree to our <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy</a>.
      </p>
    </div>
  );
}
