import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { resolveMeterPhotoState } from "../app/dashboard/meter-readings/batch/meterPhotoState.mjs";

test("meter photo state reports real evidence readiness", () => {
    assert.deepEqual(resolveMeterPhotoState({ fileIds: [11, 12] }), {
        kind: "ready",
        label: "2 ảnh",
    });
});

test("meter photo state distinguishes empty and loading evidence", () => {
    assert.equal(resolveMeterPhotoState({ fileIds: [] }).kind, "empty");
    assert.equal(resolveMeterPhotoState({ fileIds: [11], loading: true }).kind, "loading");
});

test("meter photo state distinguishes permission and download failures", () => {
    assert.equal(resolveMeterPhotoState({ fileIds: [11], error: { status: 403 } }).kind, "forbidden");
    assert.equal(resolveMeterPhotoState({ fileIds: [11], error: { status: 500 } }).kind, "error");
});

test("production meter-reading page uses backend file ids instead of sample photos", () => {
    const source = readFileSync(
        new URL("../app/dashboard/meter-readings/batch/page.jsx", import.meta.url),
        "utf8",
    );

    assert.doesNotMatch(source, /MOCK_PHOTOS|SAMPLE_PHOTOS|images\.unsplash/);
    assert.match(source, /electricityPhotoId/);
    assert.match(source, /waterPhotoId/);
    assert.match(source, /fetchMeterReadingPhoto/);
});
