import { redirect } from "next/navigation";

function getFirstQueryValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function ConfirmResetPage({ searchParams }) {
  const params = await searchParams;
  const code = (
    getFirstQueryValue(params?.code) || getFirstQueryValue(params?.token)
  ).trim();
  const suffix = code ? `?code=${encodeURIComponent(code)}` : "";

  redirect(`/forgot-password${suffix}`);
}
