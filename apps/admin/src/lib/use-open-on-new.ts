"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Dashboard quick actions link to "<list page>?new=1": run `open` once (to show the create dialog), then drop the param.
export function useOpenOnNew(open: () => void) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wanted = searchParams.get("new") === "1";
  const openRef = React.useRef(open);
  openRef.current = open;

  React.useEffect(() => {
    if (!wanted) return;
    openRef.current();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);
}
