"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getSubjectPrefixFromPathname } from "@/lib/subject";

export function SubjectThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const prefix = getSubjectPrefixFromPathname(pathname);
    const subject = prefix ? prefix.slice(1) : "";
    const el = document.documentElement;
    if (subject) {
      el.dataset.subject = subject;
    } else {
      delete el.dataset.subject;
    }
  }, [pathname]);

  return null;
}

