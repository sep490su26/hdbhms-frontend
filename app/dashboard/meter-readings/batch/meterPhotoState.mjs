export function resolveMeterPhotoState({ fileIds = [], loading = false, error = null } = {}) {
    const normalizedIds = fileIds.filter((fileId) => Number(fileId) > 0);
    if (normalizedIds.length === 0) {
        return { kind: "empty", label: "Chưa có ảnh" };
    }
    if (loading) {
        return { kind: "loading", label: "Đang tải ảnh..." };
    }
    if (error?.status === 401 || error?.status === 403) {
        return { kind: "forbidden", label: "Không có quyền xem ảnh" };
    }
    if (error) {
        return { kind: "error", label: "Không thể tải ảnh" };
    }
    return { kind: "ready", label: `${normalizedIds.length} ảnh` };
}
