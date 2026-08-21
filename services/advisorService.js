import {
  API_BASE_URL,
  ApiError,
  authenticatedFetch,
  getAuthToken,
  refreshTokenApi,
} from "@/services/identityAccessService";

function periodQuery(period) {
  return period ? `?period=${encodeURIComponent(period)}` : "";
}

export function currentAdvisorPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchAdvisorKpi(period) {
  return authenticatedFetch(`${API_BASE_URL}/advisor/kpi/overview${periodQuery(period)}`, {
    method: "GET",
  });
}

export async function fetchAdvisorAnalysis(period, options = {}) {
  return authenticatedFetch(`${API_BASE_URL}/advisor/copilot/analysis${periodQuery(period)}`, {
    method: "GET",
    signal: options.signal,
  });
}

export async function createAdvisorSession() {
  return authenticatedFetch(`${API_BASE_URL}/advisor/copilot/session`, {
    method: "POST",
  });
}

export async function fetchAdvisorSessionHistory(sessionId, options = {}) {
  return authenticatedFetch(`${API_BASE_URL}/advisor/copilot/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    signal: options.signal,
  });
}

export async function askAdvisor({ question, sessionId, period }) {
  return authenticatedFetch(`${API_BASE_URL}/advisor/copilot/ask${periodQuery(period)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sessionId }),
  });
}

export async function fetchAdvisorReport(period) {
  return authenticatedFetch(`${API_BASE_URL}/advisor/copilot/report${periodQuery(period)}`, {
    method: "POST",
    cache: "no-store",
  });
}

async function fetchReportBlob(url, token) {
  return fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Client-Type": "web",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function downloadAdvisorReportDocx(period) {
  const url = `${API_BASE_URL}/advisor/copilot/report/export-docx${periodQuery(period)}`;
  let response = await fetchReportBlob(url, getAuthToken());

  if (response.status === 401) {
    const token = await refreshTokenApi();
    response = await fetchReportBlob(url, token);
  }

  if (!response.ok) {
    throw new ApiError("Không tải được báo cáo AI.", { status: response.status });
  }

  const blob = await response.blob();
  return {
    blob,
    filename: `bao-cao-ai-${period || currentAdvisorPeriod()}.docx`,
  };
}
