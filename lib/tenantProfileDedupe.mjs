const valueOf = (item, ...keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const identityText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const identityPhone = (value) => String(value || "").replace(/[^0-9+]/g, "");

const dedupeBy = (items, keyOf) => {
  const result = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
};

export const dedupeTenantProfiles = (profiles) =>
  dedupeBy(profiles, (profile) => {
    const profileId = valueOf(profile, "id", "profileId", "profile_id");
    const contextId =
      valueOf(profile, "contractId", "contract_id") ||
      valueOf(profile, "roomId", "room_id") ||
      valueOf(profile, "roomCode", "room_code");
    if (profileId) {
      return contextId ? `context:${contextId}:profile:${profileId}` : `profile:${profileId}`;
    }
    const userId = valueOf(profile, "userId", "user_id", "accountId", "account_id");
    if (userId) return `user:${userId}`;
    return [
      "fallback",
      identityPhone(valueOf(profile, "phone")),
      identityText(valueOf(profile, "fullName", "full_name")),
      identityText(valueOf(profile, "roomCode", "room_code")),
    ].join(":");
  });

export const dedupeTenantProfileVehicles = (vehicles) =>
  dedupeBy(vehicles, (vehicle) => {
    const vehicleId = valueOf(vehicle, "id", "vehicleId", "vehicle_id");
    if (vehicleId) return `vehicle:${vehicleId}`;
    const plate = identityText(valueOf(vehicle, "licensePlate", "license_plate"));
    if (plate) return `plate:${plate}`;
    return [
      "fallback",
      identityText(valueOf(vehicle, "vehicleType", "vehicle_type")),
      identityText(valueOf(vehicle, "imageUrl", "image_url", "signedUrl", "signed_url")),
    ].join(":");
  });

export const dedupeTenantProfileEmergencyContacts = (contacts) =>
  dedupeBy(contacts, (contact) => {
    const phone = identityPhone(valueOf(contact, "phone"));
    if (phone) return `phone:${phone}`;
    return [
      "fallback",
      identityText(valueOf(contact, "fullName", "full_name")),
      identityText(valueOf(contact, "relationship")),
    ].join(":");
  });
