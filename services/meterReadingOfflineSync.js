import {
    saveProgressiveRoomReading,
    uploadMeterReadingPhoto,
} from "@/services/meterReadingService";

const DB_NAME = "hdbhms-meter-readings";
const DB_VERSION = 1;
const QUEUE_STORE = "pendingRoomReadings";
const CACHE_PREFIX = "hdbhms:meter-readings:batch-status:";

export const OFFLINE_METER_READING_QUEUE_EVENT = "hdbhms:meter-reading-queue-changed";

function hasBrowserStorage() {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function emitQueueChanged() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OFFLINE_METER_READING_QUEUE_EVENT));
}

function normalizeScopeValue(value) {
    return String(value ?? "").trim() || "default";
}

function makeQueueId(batchId, roomId) {
    return `${normalizeScopeValue(batchId)}:${normalizeScopeValue(roomId)}`;
}

function makeCacheKey(period, propertyId) {
    return `${CACHE_PREFIX}${normalizeScopeValue(propertyId)}:${normalizeScopeValue(period)}`;
}

function openOfflineDb() {
    if (!hasBrowserStorage()) {
        return Promise.reject(new Error("IndexedDB is not available"));
    }

    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Cannot open offline queue"));
    });
}

async function withStore(mode, callback) {
    const db = await openOfflineDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(QUEUE_STORE, mode);
        const store = transaction.objectStore(QUEUE_STORE);
        let callbackResult;

        transaction.oncomplete = () => {
            db.close();
            resolve(callbackResult);
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error("Offline queue transaction failed"));
        };
        transaction.onabort = () => {
            db.close();
            reject(transaction.error || new Error("Offline queue transaction aborted"));
        };

        try {
            callbackResult = callback(store);
        } catch (error) {
            transaction.abort();
            reject(error);
        }
    });
}

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
}

export function isOfflineSaveError(error) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    return !error?.status;
}

export async function cacheBatchMeterReadingsStatus(period, propertyId, data) {
    if (typeof window === "undefined" || !data) return;

    try {
        window.localStorage.setItem(
            makeCacheKey(period, propertyId),
            JSON.stringify({
                cachedAt: new Date().toISOString(),
                data,
            }),
        );
    } catch {
        // Cache is best-effort only.
    }
}

export async function getCachedBatchMeterReadingsStatus(period, propertyId) {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(makeCacheKey(period, propertyId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.data || null;
    } catch {
        return null;
    }
}

export async function queueMeterReadingForSync(entry) {
    if (!entry?.batchId || !entry?.roomId) {
        throw new Error("Missing batch or room for offline meter reading");
    }

    const now = new Date().toISOString();
    const queuedEntry = {
        id: makeQueueId(entry.batchId, entry.roomId),
        batchId: entry.batchId,
        roomId: entry.roomId,
        roomCode: entry.roomCode || "",
        period: entry.period || "",
        propertyId: entry.propertyId || "",
        electricityValue: entry.electricityValue,
        waterValue: entry.waterValue,
        electricityPhotoId: entry.electricityPhotoId ?? null,
        waterPhotoId: entry.waterPhotoId ?? null,
        electricityPhotoFile: entry.electricityPhotoFile ?? null,
        electricityPhotoName: entry.electricityPhotoName || entry.electricityPhotoFile?.name || "electricity-meter.jpg",
        waterPhotoFile: entry.waterPhotoFile ?? null,
        waterPhotoName: entry.waterPhotoName || entry.waterPhotoFile?.name || "water-meter.jpg",
        attemptCount: entry.attemptCount ?? 0,
        lastError: entry.lastError || "",
        createdAt: entry.createdAt || now,
        updatedAt: now,
    };

    await withStore("readwrite", (store) => {
        store.put(queuedEntry);
    });
    emitQueueChanged();
    return queuedEntry;
}

export async function getQueuedMeterReadings({ batchId, propertyId, period } = {}) {
    if (!hasBrowserStorage()) return [];

    const items = await withStore("readonly", (store) => requestToPromise(store.getAll()));
    return (items || []).filter((item) => {
        if (batchId && String(item.batchId) !== String(batchId)) return false;
        if (propertyId && String(item.propertyId || "") !== String(propertyId)) return false;
        if (period && String(item.period || "") !== String(period)) return false;
        return true;
    });
}

async function removeQueuedMeterReading(id) {
    await withStore("readwrite", (store) => {
        store.delete(id);
    });
    emitQueueChanged();
}

function fileFromQueuedPhoto(photoFile, fallbackName) {
    if (!photoFile) return null;
    if (typeof File !== "undefined" && photoFile instanceof File) return photoFile;
    if (typeof File !== "undefined" && photoFile instanceof Blob) {
        return new File([photoFile], fallbackName, { type: photoFile.type || "image/jpeg" });
    }
    return photoFile;
}

async function markSyncFailed(item, error) {
    await queueMeterReadingForSync({
        ...item,
        attemptCount: Number(item.attemptCount || 0) + 1,
        lastError: error?.details || error?.message || "Sync failed",
        createdAt: item.createdAt,
    });
}

export async function syncQueuedMeterReadings() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const pending = await getQueuedMeterReadings();
        return { synced: 0, failed: 0, pending: pending.length, skipped: true };
    }

    const items = await getQueuedMeterReadings();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
        try {
            let electricityPhotoId = item.electricityPhotoId;
            let waterPhotoId = item.waterPhotoId;

            if (!electricityPhotoId) {
                const photoFile = fileFromQueuedPhoto(item.electricityPhotoFile, item.electricityPhotoName);
                if (!photoFile) throw new Error("Missing electricity evidence photo");
                const response = await uploadMeterReadingPhoto(photoFile);
                electricityPhotoId = response?.fileId || response?.id;
                if (!electricityPhotoId) throw new Error("Cannot upload electricity evidence photo");
            }

            if (!waterPhotoId) {
                const photoFile = fileFromQueuedPhoto(item.waterPhotoFile, item.waterPhotoName);
                if (!photoFile) throw new Error("Missing water evidence photo");
                const response = await uploadMeterReadingPhoto(photoFile);
                waterPhotoId = response?.fileId || response?.id;
                if (!waterPhotoId) throw new Error("Cannot upload water evidence photo");
            }

            await saveProgressiveRoomReading(item.batchId, item.roomId, {
                electricityValue: item.electricityValue,
                waterValue: item.waterValue,
                electricityPhotoId,
                waterPhotoId,
            });

            await removeQueuedMeterReading(item.id);
            synced += 1;
        } catch (error) {
            failed += 1;
            await markSyncFailed(item, error);
            if (!isOfflineSaveError(error)) break;
        }
    }

    const pending = await getQueuedMeterReadings();
    return { synced, failed, pending: pending.length, skipped: false };
}
