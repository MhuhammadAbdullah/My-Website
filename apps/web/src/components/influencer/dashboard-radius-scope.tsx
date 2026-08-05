"use client";

import { useEffect } from "react";

// The `rounded-2xl` design token is shared with the public marketing pages
// via globals.css, so it can't be dialed down there without affecting the
// rest of the site. Toggling a class on `<body>` (rather than a wrapper div
// further down the tree) means the override also reaches Radix Dialog/
// Dropdown content, which portals directly into `document.body` and would
// otherwise sit outside a nested wrapper's CSS custom-property inheritance.
export function InfluencerDashboardRadiusScope() {
  useEffect(() => {
    document.body.classList.add("influencer-dashboard-scope");
    return () => {
      document.body.classList.remove("influencer-dashboard-scope");
    };
  }, []);

  return null;
}
