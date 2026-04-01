"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import type { AnchorHTMLAttributes } from "react";

import { getSubjectPrefixFromPathname } from "@/lib/subject";

type Props = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
    LinkProps & {
      /** По умолчанию true: добавлять subject prefix к href="/..." */
      subjectAware?: boolean;
    }
>;

function prefixHref(href: Props["href"], prefix: string): Props["href"] {
  if (!prefix) return href;

  if (typeof href === "string") {
    if (!href.startsWith("/")) return href;
    if (href.startsWith(prefix + "/") || href === prefix) return href;
    if (href.startsWith("/auth/")) return href;
    // Профиль и настройки пользователя — глобальные, без префикса предмета.
    if (href === "/settings" || href.startsWith("/settings/")) return href;
    return `${prefix}${href}`;
  }

  const pathname = href.pathname;
  if (typeof pathname !== "string") return href;
  if (!pathname.startsWith("/")) return href;
  if (pathname.startsWith(prefix + "/") || pathname === prefix) return href;
  if (pathname.startsWith("/auth/")) return href;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return href;

  return { ...href, pathname: `${prefix}${pathname}` };
}

export function SubjectLink({ subjectAware = true, href, ...rest }: Props) {
  const pathname = usePathname();
  const prefix = subjectAware ? getSubjectPrefixFromPathname(pathname) : "";

  return <Link href={prefixHref(href, prefix)} {...rest} />;
}

