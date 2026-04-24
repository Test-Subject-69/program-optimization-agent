"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function useQueryState(defaults) {
  const router = useRouter();
  const pathname = usePathname();
  const [queryString, setQueryString] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => setQueryString(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  const state = useMemo(() => {
    const params = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
    return Object.fromEntries(
      Object.entries(defaults).map(([key, defaultValue]) => [key, params.get(key) ?? defaultValue])
    );
  }, [defaults, queryString]);

  const setState = useCallback(
    (updates) => {
      const next = typeof updates === "function" ? updates(state) : updates;
      const params = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);

      for (const [key, value] of Object.entries(next)) {
        const defaultValue = defaults[key];
        if (value === undefined || value === null || value === "" || value === defaultValue) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      setQueryString(query ? `?${query}` : "");
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, pathname, queryString, router, state]
  );

  return [state, setState];
}
