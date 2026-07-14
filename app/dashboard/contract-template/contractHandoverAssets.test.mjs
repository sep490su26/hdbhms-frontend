import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultHandoverAssets,
  mergeHandoverAssets,
} from "./contractHandoverAssets.js";

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
