import { useEffect, useState } from "react";

/**
 * Tiny hash router: `#/day/2026-07-12?from=search`. Hash routing keeps the
 * build deployable to any static host or sub-path with no server rewrites.
 * Each entry records its depth in `history.state`, so "back" can tell whether
 * there is an in-app page to return to (on a cold start there isn't).
 */

export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

const EVENT = "ratedays:navigate";

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = raw.split("?");
  return { path, parts: path.split("/").filter(Boolean), query: new URLSearchParams(qs) };
}

function currentDepth(): number {
  const s = window.history.state as { depth?: number } | null;
  return typeof s?.depth === "number" ? s.depth : 0;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  return route;
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const hash = `#${to}`;
  if (opts.replace) window.history.replaceState({ depth: currentDepth() }, "", hash);
  else window.history.pushState({ depth: currentDepth() + 1 }, "", hash);
  window.dispatchEvent(new Event(EVENT));
}

export function back(fallback = "/"): void {
  if (currentDepth() > 0) window.history.back();
  else navigate(fallback, { replace: true });
}
