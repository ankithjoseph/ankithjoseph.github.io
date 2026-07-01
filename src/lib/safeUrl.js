// Guards against dangerous URL schemes (javascript:, data:, vbscript:) leaking
// from data/resume.yaml into rendered href/src attributes. Only allows the
// schemes this site actually uses, plus relative/anchor/base-relative paths.
// Returns "#" for anything it can't vouch for.

const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

export function safeUrl(value) {
  if (!value || typeof value !== "string") return "#";
  const trimmed = value.trim();

  // Relative paths, anchors, and root/base-relative URLs have no scheme — safe.
  if (/^(\/|#|\.\.?\/)/.test(trimmed)) return trimmed;

  // Scheme-relative (//host) — normalize to https.
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  try {
    const url = new URL(trimmed);
    return ALLOWED_SCHEMES.has(url.protocol) ? trimmed : "#";
  } catch {
    // No parseable scheme (e.g. "example.com/path") — treat as a bare host.
    return `https://${trimmed}`;
  }
}
