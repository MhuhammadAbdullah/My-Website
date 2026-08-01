import * as React from "react";

// Turns an admin-pasted HTML/JS snippet (Settings → Integrations → Custom
// Scripts) into real React elements rendered server-side, instead of
// injecting it into the DOM client-side after load. That distinction
// matters: crawlers (Google Search Console's meta-tag verification, Bing,
// etc.) only recognize a verification tag if it's present in the raw HTML
// response -- a tag added by client-side JavaScript after the page has
// already loaded is invisible to that check. Server-rendering also means
// <meta>/<link> tags get picked up by Next/React's built-in head-hoisting
// regardless of where in the tree they're rendered, and <script> tags run
// immediately with the initial HTML instead of waiting for hydration.
//
// This is a regex-based extractor, not a full HTML parser -- snippets here
// are realistically a handful of <meta>/<link>/<script>/<noscript> tags
// (verification tags, extra pixels), never a full document. Anything else
// pasted alongside those (a <style> block, a stray <div>) still renders,
// just as inert markup rather than a hoisted/executable element.
//
// Content is Super-Admin-only (gated by the "settings" RBAC resource, see
// apps/api/src/routes/settings.routes.ts) -- the same trust boundary as any
// other CMS field an admin can save, not user-facing input.

type Attrs = Record<string, string | boolean>;

function parseAttributes(raw: string): Attrs {
  const attrs: Attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const [, name, dq, sq, uq] = match;
    if (!name) continue;
    attrs[name] = dq ?? sq ?? uq ?? true;
  }
  return attrs;
}

interface Extracted {
  start: number;
  end: number;
  node: React.ReactNode;
}

function extractAll(
  html: string,
  regex: RegExp,
  build: (attrs: Attrs, content: string, key: string) => React.ReactNode,
  keyPrefix: string,
  startIndex: number,
): Extracted[] {
  const out: Extracted[] = [];
  let match: RegExpExecArray | null;
  let i = startIndex;
  regex.lastIndex = 0;
  while ((match = regex.exec(html))) {
    const attrs = parseAttributes(match[1] ?? "");
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      node: build(attrs, match[2] ?? "", `${keyPrefix}-${i++}`),
    });
  }
  return out;
}

export function renderRawHtml(html: string | undefined, keyPrefix: string): React.ReactNode {
  if (!html || !html.trim()) return null;

  let cursor = 0;
  const scripts = extractAll(
    html,
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (attrs, content, key) => <script key={key} {...(attrs as Record<string, string>)} dangerouslySetInnerHTML={{ __html: content }} />,
    keyPrefix,
    cursor,
  );
  cursor += scripts.length;
  const noscripts = extractAll(
    html,
    /<noscript\b([^>]*)>([\s\S]*?)<\/noscript>/gi,
    (attrs, content, key) => <noscript key={key} {...(attrs as Record<string, string>)} dangerouslySetInnerHTML={{ __html: content }} />,
    keyPrefix,
    cursor,
  );
  cursor += noscripts.length;
  const metas = extractAll(
    html,
    /<meta\b([^>]*?)\/?>/gi,
    (attrs, _content, key) => <meta key={key} {...(attrs as Record<string, string>)} />,
    keyPrefix,
    cursor,
  );
  cursor += metas.length;
  const links = extractAll(
    html,
    /<link\b([^>]*?)\/?>/gi,
    (attrs, _content, key) => <link key={key} {...(attrs as Record<string, string>)} />,
    keyPrefix,
    cursor,
  );

  const consumed = [...scripts, ...noscripts, ...metas, ...links].sort((a, b) => a.start - b.start);

  // Whatever text isn't part of a recognized tag (style blocks, stray
  // markup) still gets rendered, just as inert HTML rather than a
  // hoisted/executable element.
  let leftover = html;
  for (const c of [...consumed].sort((a, b) => b.start - a.start)) {
    leftover = leftover.slice(0, c.start) + leftover.slice(c.end);
  }

  const nodes: React.ReactNode[] = consumed.map((c) => c.node);
  if (leftover.trim()) {
    nodes.push(
      <div key={`${keyPrefix}-leftover`} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: leftover }} />,
    );
  }

  if (nodes.length === 0) return null;
  return <React.Fragment>{nodes}</React.Fragment>;
}
