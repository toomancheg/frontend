import { notFound, redirect } from "next/navigation";

import { isKnownSubjectSlug } from "@/lib/subject";

export default function SubjectRootPage({ params }: { params: { subject: string } }) {
  // Защита от ложных совпадений динамического сегмента (например, запросов /page.css),
  // чтобы они не редиректились в /<subject>/dashboard.
  if (!isKnownSubjectSlug(params.subject)) {
    notFound();
  }
  redirect(`/${params.subject}/dashboard`);
}

