import { redirect } from "next/navigation";

export default function SubjectRootPage({ params }: { params: { subject: string } }) {
  redirect(`/${params.subject}/dashboard`);
}

