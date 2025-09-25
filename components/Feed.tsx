// components/Feed.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JobDetailCard from "@/components/JobDetailCard";
import type { Job } from "@/types";

const STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
type StateCode = (typeof STATES)[number] | "ALL";

function useIsDesktop(breakpointPx = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= breakpointPx
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [breakpointPx]);
  return isDesktop;
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.floor((now - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function costDisplay(j: Job) {
  if (j.cost_type === "exact" && j.cost != null && String(j.cost).trim() !== "") {
    const n = Number(j.cost);
    return isFinite(n) ? `$${Math.round(n).toLocaleString()}` : `$${String(j.cost)}`;
  }
  if (j.cost_type === "range" && j.cost_min != null && j.cost_max != null) {
    const minN = Number(j.cost_min);
    const maxN = Number(j.cost_max);
    const left = isFinite(minN) ? Math.round(minN).toLocaleString() : String(j.cost_min);
    const right = isFinite(maxN) ? Math.round(maxN).toLocaleString() : String(j.cost_max);
    return `$${left}–$${right}`;
  }
  return "Cost not shared";
}

function FeedInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const isDesktop = useIsDesktop(1024); // lg breakpoint

  const [query, setQuery] = useState<string>(search.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState<StateCode>((search.get("state") as StateCode) || "ALL");
  const [recOnly, setRecOnly] = useState<boolean>((
