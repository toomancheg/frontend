import { redirect } from "next/navigation";

/** Старые URL вида /chemistry/settings → единый /settings */
export default function LegacySubjectSettingsRedirect() {
  redirect("/settings");
}
