// app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://burbli.vercel.app";
  const routes = [
    "/",
    "/feed",
    "/submit",
    "/signin",
    "/myposts",
    "/privacy",
    "/terms",
    "/contact",
  ];
  const now = new Date();
  return routes.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.6,
  }));
}
