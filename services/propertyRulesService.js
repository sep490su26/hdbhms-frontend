import { API_BASE_URL } from "@/lib/apiConfig";

function readField(source, ...keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (Object.prototype.hasOwnProperty.call(payload, "code") && payload.code !== 0)) {
    throw new Error(payload.message || payload.details || fallbackMessage);
  }

  return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

function normalizeProperty(raw = {}) {
  return {
    id: readField(raw, "id", "propertyId", "property_id"),
    name: readField(raw, "name", "propertyName", "property_name") || "Cơ sở",
    propertyCode: readField(raw, "propertyCode", "property_code") || "",
  };
}

function normalizePropertyRule(raw = {}) {
  const defaultFineAmount = toOptionalNumber(readField(raw, "defaultFineAmount", "default_fine_amount"));

  return {
    id: readField(raw, "id"),
    propertyId: readField(raw, "propertyId", "property_id"),
    ruleCode: readField(raw, "ruleCode", "rule_code", "code") || "",
    title: readField(raw, "title", "name") || "Nội quy",
    description: readField(raw, "description", "content", "text") || "",
    defaultFineAmount,
    sortOrder: toNumber(readField(raw, "sortOrder", "sort_order", "order"), 9999),
    status: readField(raw, "status") || "ACTIVE",
  };
}

function sortRules(left, right) {
  const sortOrderDiff = left.sortOrder - right.sortOrder;
  if (sortOrderDiff !== 0) return sortOrderDiff;
  return left.ruleCode.localeCompare(right.ruleCode);
}

export async function fetchRuleProperties() {
  const response = await fetch(`${API_BASE_URL}/properties/simple`, { cache: "no-store" });
  const data = await readApiResponse(response, "Không thể tải danh sách cơ sở.");
  return Array.isArray(data) ? data.map(normalizeProperty).filter((property) => property.id) : [];
}

export async function fetchPropertyRules(propertyId) {
  if (!propertyId) return [];

  const response = await fetch(`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/rules`, {
    cache: "no-store",
  });
  const data = await readApiResponse(response, "Không thể tải nội quy.");
  return Array.isArray(data)
    ? data
        .map(normalizePropertyRule)
        .filter((rule) => String(rule.status || "").toUpperCase() === "ACTIVE")
        .sort(sortRules)
    : [];
}

export async function fetchPropertyRulesCatalog({ propertyId } = {}) {
  const properties = await fetchRuleProperties();
  const property = propertyId
    ? properties.find((item) => String(item.id) === String(propertyId))
    : properties[0];

  if (!property) {
    return { properties, property: null, rules: [] };
  }

  const rules = await fetchPropertyRules(property.id);
  return { properties, property, rules };
}
