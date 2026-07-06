import { redirect } from "next/navigation";

export default function AccountsIndexPage() {
  redirect("/dashboard/accounts/tenants");
}
