export const SUBJECT_SECTIONS = [
  "dashboard",
  "theory",
  "practice",
  "exam",
  "progress",
  "subscription",
  "settings",
  "admin",
] as const;

export function getSubjectPrefixFromPathname(pathname: string | null | undefined): string {
  const path = pathname ?? "";
  const sections = SUBJECT_SECTIONS.join("|");
  const m = path.match(new RegExp(`^/([a-z][a-z0-9_-]*)/(${sections})(/|$)`, "i"));
  if (!m) return "";
  const slug = (m[1] ?? "").toLowerCase();
  return slug ? `/${slug}` : "";
}

