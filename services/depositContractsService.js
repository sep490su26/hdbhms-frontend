import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

export async function previewDepositContract(metadata) {
  if (!metadata?.roomId) {
    throw new Error("Chưa xác định được phòng cần xem hợp đồng.");
  }
  const data = await authenticatedFetch(`${API_BASE_URL}/deposit/contract-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  return { html: data?.html || "" };
}
