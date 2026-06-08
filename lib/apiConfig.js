const LOCAL_API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === '10.0.2.2'
  ? "http://10.0.2.2:8080/api/v1"
  : "http://localhost:8080/api/v1";

function normalizeApiBaseUrl(value) {
    return value ? value.replace(/\/+$/, "") : "";
}

const configuredApiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

if (process.env.NODE_ENV === "production" && !configuredApiBaseUrl) {
    throw new Error(
        "Missing NEXT_PUBLIC_API_BASE_URL for production build/runtime. Set it to the staging backend API URL, e.g. https://api-staging.example.com/api/v1."
    );
}

export const API_BASE_URL = configuredApiBaseUrl || LOCAL_API_BASE_URL;
