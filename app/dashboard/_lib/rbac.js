export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  PUBLIC: "public",
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: "Chủ trọ",
  [ROLES.MANAGER]: "Quản lý",
  [ROLES.ACCOUNTANT]: "Kế toán",
};

export const ROLE_ALIASES = {
  admin: ROLES.OWNER,
  owner: ROLES.OWNER,
  manager: ROLES.MANAGER,
  accountant: ROLES.ACCOUNTANT,
};

export const SECTION_PERMISSIONS = {
  dashboard: [ROLES.PUBLIC],
  floor: [ROLES.OWNER, ROLES.MANAGER],
  rooms: [ROLES.OWNER, ROLES.MANAGER],
  tenants: [ROLES.OWNER, ROLES.MANAGER],
  viewingCustomers: [ROLES.OWNER, ROLES.MANAGER],
  accounts: [ROLES.OWNER],
  meterReadings: [ROLES.OWNER, ROLES.MANAGER],
  maintenance: [ROLES.OWNER, ROLES.MANAGER],
  deposits: [ROLES.OWNER],
  contract: [ROLES.OWNER],
  finance: [ROLES.OWNER, ROLES.ACCOUNTANT],
  settings: [ROLES.OWNER],
};

export const ACTION_PERMISSIONS = {
  approveEmployeeAccount: [ROLES.OWNER],
  editSystemConfig: [ROLES.OWNER],
  viewFinancialReports: [ROLES.OWNER, ROLES.ACCOUNTANT],
  exportFinancialReports: [ROLES.OWNER, ROLES.ACCOUNTANT],
  mutateInvoice: [ROLES.OWNER],
  enterMeterReadings: [ROLES.OWNER, ROLES.MANAGER],
  createIncidentTicket: [ROLES.OWNER, ROLES.MANAGER],
  submitTransferOpinion: [ROLES.OWNER, ROLES.MANAGER],
  approveRoomTransfer: [ROLES.OWNER],
  changeOwnRole: [ROLES.OWNER],
};

export function normalizeRole(role) {
  return ROLE_ALIASES[String(role || "").toLowerCase()] || "";
}

export function canAccessRole(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  const normalizedAllowedRoles = allowedRoles.map((allowedRole) => String(allowedRole || "").toLowerCase()).filter(Boolean);

  if (normalizedAllowedRoles.includes(ROLES.PUBLIC)) {
    return true;
  }

  if (!normalizedRole) {
    return normalizedAllowedRoles.includes(ROLES.PUBLIC);
  }

  return normalizedAllowedRoles.includes(normalizedRole);
}

export function canAccessSection(role, sectionId) {
  return canAccessRole(role, SECTION_PERMISSIONS[sectionId] || []);
}

export function getFirstAllowedSection(role, navigationItems) {
  return navigationItems.find((item) => canAccessSection(role, item.id))?.id || "dashboard";
}
