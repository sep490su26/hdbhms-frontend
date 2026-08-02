import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createEmptyHandoverAsset,
  createDefaultHandoverAssets,
  getPersistedAssetIds,
  mergeHandoverAssets,
  withAssetRowKeys,
} from "./contractHandoverAssets.js";

const handoverSectionSource = readFileSync(
  new URL("./ContractHandoverSection.jsx", import.meta.url),
  "utf8",
);

test("default handover inventory contains the nine required rows", () => {
  const assets = createDefaultHandoverAssets();

  assert.equal(assets.length, 9);
  assert.deepEqual(
    assets.map((asset) => asset.assetName),
    [
      "Điều hòa + Remote",
      "Thiết bị vệ sinh + phòng tắm",
      "Bình nóng lạnh",
      "Tủ quần áo 3 buồng",
      "Bàn học",
      "Giường đôi/tầng + Dát giường",
      "Cửa đi + cửa sổ",
      "Modem Internet",
      "Hệ thống điện: công tắc, ổ cắm, bóng điện",
    ],
  );
});

test("seed room assets are merged into the complete inventory", () => {
  const assets = mergeHandoverAssets([
    { id: 1, assetName: "Điều hòa", currentCondition: "GOOD", quantity: 1 },
    {
      id: 2,
      assetName: "Remote điều hòa",
      currentCondition: "MISSING",
      quantity: 1,
    },
    {
      id: 3,
      assetName: "Bình nóng lạnh",
      currentCondition: "ATTENTION",
      quantity: 1,
    },
    { id: 4, assetName: "Giường", currentCondition: "GOOD", quantity: 1 },
  ]);

  assert.equal(assets.length, 9);
  assert.equal(assets[0].id, 1);
  assert.equal(assets[0].currentCondition, "MISSING");
  assert.equal(assets[0].sourceAssets.length, 2);
  assert.equal(assets[2].id, 3);
  assert.equal(assets[5].id, 4);
});

test("custom system assets remain visible after the required rows", () => {
  const assets = mergeHandoverAssets([
    { id: 99, assetName: "Máy giặt", currentCondition: "GOOD", quantity: 1 },
  ]);

  assert.equal(assets.length, 10);
  assert.equal(assets[9].assetName, "Máy giặt");
  assert.equal(assets[9].id, 99);
});

test("zero quantity is preserved while missing quantity defaults to one", () => {
  const zeroQuantityAssets = mergeHandoverAssets([
    {
      id: 3,
      assetName: "Bình nóng lạnh",
      currentCondition: "MISSING",
      quantity: 0,
    },
  ]);
  const missingQuantityAssets = mergeHandoverAssets([
    { id: 3, assetName: "Bình nóng lạnh", currentCondition: "GOOD" },
  ]);

  assert.equal(zeroQuantityAssets[2].quantity, 0);
  assert.equal(missingQuantityAssets[2].quantity, 1);
});

test("new handover rows start with editable defaults", () => {
  assert.deepEqual(createEmptyHandoverAsset(), {
    id: null,
    assetName: "",
    assetCategory: "",
    quantity: 1,
    currentCondition: "GOOD",
    description: "",
    fileImageId: null,
    imageFile: null,
    imageUrl: "",
    sourceAssets: [],
  });
});

test("persisted IDs cannot collide with unsaved row indexes", () => {
  const rows = withAssetRowKeys(
    [
      { id: 3 },
      { id: null },
      { id: null },
      { id: null },
      { id: 3 },
    ],
    "room-35",
  );
  const keys = rows.map((asset) => asset._clientKey);

  assert.equal(keys[0], "room-35-id-3");
  assert.equal(keys[3], "room-35-new-3");
  assert.equal(keys[4], "room-35-id-3-duplicate-1");
  assert.equal(new Set(keys).size, rows.length);
});

test("all persisted IDs represented by a merged row are deleted together", () => {
  assert.deepEqual(
    getPersistedAssetIds({
      id: 10,
      sourceAssets: [{ id: 10 }, { id: 11 }, { id: null }],
    }),
    [10, 11],
  );
  assert.deepEqual(getPersistedAssetIds(createEmptyHandoverAsset()), []);
});

test("handover editor exposes add, remove, undo, and persisted deletion controls", () => {
  assert.match(handoverSectionSource, /Thêm thiết bị/);
  assert.match(handoverSectionSource, /handleRemoveAsset/);
  assert.match(handoverSectionSource, /Hoàn tác/);
  assert.match(handoverSectionSource, /deletedAssetIds,/);
});

test("handover save requires confirmation before locking the editor", () => {
  assert.match(handoverSectionSource, /onClick=\{requestSave\}/);
  assert.match(handoverSectionSource, /setSaveConfirmationOpen\(true\)/);
  assert.match(
    handoverSectionSource,
    /Sau khi xác nhận lưu, dữ liệu bàn giao sẽ được chốt và không thể chỉnh sửa\./,
  );
  assert.match(handoverSectionSource, /Kiểm tra lại/);
  assert.match(handoverSectionSource, /Xác nhận lưu/);
});

test("quantity uses manual non-negative integer input without spinner controls", () => {
  assert.match(handoverSectionSource, /min="0"/);
  assert.match(handoverSectionSource, /step="1"/);
  assert.match(handoverSectionSource, /inputMode="numeric"/);
  assert.match(handoverSectionSource, /webkit-inner-spin-button/);
  assert.match(handoverSectionSource, /Number\.isInteger\(Number\(a\.quantity\)\)/);
});
