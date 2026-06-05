const NETWORK_DELAY_MS = 550;

function wait(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMockRequest(value, { shouldFail = false } = {}) {
  await wait();

  if (shouldFail) {
    const error = new Error("Mất kết nối, vui lòng thử lại");
    error.code = "NETWORK_ERROR";
    throw error;
  }

  return structuredClone(value);
}

export async function createFacility(data, options) {
  const timestamp = Date.now();

  return runMockRequest(
    {
      ...data,
      id: `facility-${timestamp}`,
      code: `CS-${String(timestamp).slice(-4)}`,
      floors: [],
      hasActiveContracts: false,
      hasOutstandingDebts: false,
    },
    options,
  );
}

export async function updateFacility(id, data, options) {
  return runMockRequest({ id, ...data }, options);
}

export async function updateFacilityStatus(id, status, options) {
  return runMockRequest({ id, status }, options);
}
