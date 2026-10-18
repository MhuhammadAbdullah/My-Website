// sanitize-html ships no types; only the surface this API uses is declared.
declare module "sanitize-html" {
  interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
    transformTags?: Record<string, unknown>;
    disallowedTagsMode?: "discard" | "escape" | "recursiveEscape";
  }
  interface SanitizeHtml {
    (dirty: string, options?: IOptions): string;
    simpleTransform(tagName: string, attribs: Record<string, string>, merge?: boolean): unknown;
  }
  const sanitizeHtml: SanitizeHtml;
  export default sanitizeHtml;
}
