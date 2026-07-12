import { cn } from "./lib/cn";

// Renders HTML produced by RichTextEditor. Shared by the public site and the
// admin's Preview dialog so both render identically -- see the `.rich-text`
// rules in styles/globals.css for the actual typography.
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
