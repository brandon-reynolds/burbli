// components/JobDetailCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types";

function formatAUD(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `A$${Math.round(n).toLocaleString("en-AU")}`;
  }
}

function buildCostLabel(job: Job | null): string {
  if (!job) return "Cost not shared";

  const exact = formatAUD(job.cost);
  const minS = formatAUD(job.cost_min);
  const maxS = formatAUD(job.cost_max);
  const type = job.cost_type as "exact" | "range" | "from" | null;

  switch (type) {
    case "exact":
      if (exact) return `${exact}`;
      if (minS && maxS) return `${minS}–${maxS}`;
      if (minS) return `From ${minS}`;
      if (maxS) return `Up to ${maxS}`;
      return "Cost not shared";

    case "range":
      if (minS && maxS) return `${minS}–${maxS}`;
      if (minS) return `From ${minS}`;
      if (maxS) return `Up to ${maxS}`;
      if (exact) return `${exact}`;
      return "Cost not shared";

    case "from":
      if (exact) return `From ${exact}`;
      if (minS) return `From ${minS}`;
      if (minS && maxS) return `${minS}–${maxS}`;
      if (maxS) return `Up to ${maxS}`;
      return "Cost not shared";

    default:
      if (exact) return `${exact}`;
      if (minS && maxS) return `${minS}–${maxS}`;
      if (minS) return `From ${minS}`;
      if (maxS) return `Up to ${maxS}`;
      return "Cost not shared";
  }
}

export default function JobDetailCard({ job }: { job: Job | null }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ignore) setCurrentUserId(user?.id ?? null);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!el.closest("[data-detail-menu-root]")) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const shareUrl = useMemo(() => {
    if (!job?.id || typeof window === "undefined") return "";
    return `${window.location.origin}/post/${job.id}`;
  }, [job?.id]);

  const costDisplay = useMemo(() => buildCostLabel(job), [job?.cost, job?.cost_min, job?.cost_max, job?.cost_type]);

  a
