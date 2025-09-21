"use client";
import { useEffect, useState } from "react";

export default function CopyLink() {
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState("");

  useEffect(() => {
    setHref(window.location.href);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Couldn’t copy link");
    }
  }

  return (
    <button
      onClick={copy}
      className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-black"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
