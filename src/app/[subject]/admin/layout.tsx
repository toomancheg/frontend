import { ReactNode } from "react";

import { AdminGate } from "@/app/admin/AdminGate";

export default function SubjectAdminLayout({ children }: { children: ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}

