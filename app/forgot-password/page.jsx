import ForgotPasswordClient from "./ForgotPasswordClient";

function getFirstQueryValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  const initialResetToken = (
    getFirstQueryValue(params?.code) || getFirstQueryValue(params?.token)
  ).trim();

  return <ForgotPasswordClient initialResetToken={initialResetToken} />;
}
