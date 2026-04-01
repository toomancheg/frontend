export const SUBJECT_SECTIONS = [
  "dashboard",
  "theory",
  "practice",
  "exam",
  "progress",
  "subscription",
  "admin",
] as const;

export const KNOWN_SUBJECTS = ["physics", "math", "cs", "chemistry"] as const;
export type KnownSubject = (typeof KNOWN_SUBJECTS)[number];

export function isKnownSubjectSlug(slug: string): slug is KnownSubject {
  return (KNOWN_SUBJECTS as readonly string[]).includes(slug.toLowerCase());
}

export function getSubjectPrefixFromPathname(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  const sections = SUBJECT_SECTIONS.join("|");
  const m = path.match(new RegExp(`^/([a-z][a-z0-9_-]*)/(${sections})(/|$)`, "i"));
  if (!m) return "";
  const slug = (m[1] ?? "").toLowerCase();
  return slug ? `/${slug}` : "";
}

