"use client";

import * as React from "react";

type InjectTarget = "head" | "body-start" | "body-end";

// Scripts assigned via `element.innerHTML` are inert by spec -- the browser
// parses them but never executes them. To let admin-pasted snippets (which
// are often a mix of <script>/<noscript>/<meta> tags, not just one bare
// script) actually run, each <script> node has to be re-created and
// re-appended by hand; everything else can be cloned in directly.
function injectHtml(container: ParentNode, html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  Array.from(temp.childNodes).forEach((node) => {
    if (node instanceof HTMLScriptElement) {
      const script = document.createElement("script");
      Array.from(node.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
      script.text = node.text;
      container.appendChild(script);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });
}

// Module-scoped (not React state) so a given snippet is only ever injected
// once per page load even across React StrictMode's double-invoked effects
// in development.
const injectedKeys = new Set<string>();

/**
 * Renders an admin-configured raw HTML/JS snippet (Settings → Integrations →
 * Custom Scripts) into `head`, the top of `body`, or just before `</body>`.
 * The snippet never flows through server-rendered HTML string concatenation
 * -- it arrives as a normal React prop and is only turned into live DOM
 * nodes client-side via DOM APIs, which is what keeps this from being a
 * server-side HTML-injection vector on top of the existing Super-Admin-only
 * `settings:update` permission gate on who can author it.
 */
export function CustomScript({ html, target, id }: { html: string | undefined; target: InjectTarget; id: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!html || !html.trim()) return;
    const key = `${id}:${target}`;
    if (injectedKeys.has(key)) return;
    injectedKeys.add(key);

    if (target === "head") {
      injectHtml(document.head, html);
    } else if (ref.current) {
      injectHtml(ref.current, html);
    }
  }, [html, target, id]);

  if (target === "head") return null;
  return <div ref={ref} data-custom-script={id} style={{ display: "contents" }} />;
}
