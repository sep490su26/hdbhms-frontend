const ASSET_DEFINITIONS = [
  {
    assetName: "Điều hòa + Remote",
    assetCategory: "Thiết bị điện tử",
    description: "",
    aliases: [
      "dieu hoa + remote",
      "dieu hoa",
      "remote dieu hoa",
      "may lanh",
      "remote may lanh",
    ],
  },
  {
    assetName: "Thiết bị vệ sinh + phòng tắm",
    assetCategory: "Thiết bị vệ sinh",
    description: "Xí, vòi xịt, vòi sen, lavabo, gương, phụ kiện",
    aliases: [
      "thiet bi ve sinh + phong tam",
      "thiet bi ve sinh",
      "phong tam",
    ],
  },
  {
    assetName: "Bình nóng lạnh",
    assetCategory: "Thiết bị điện tử",
    description: "",
    aliases: ["binh nong lanh"],
  },
  {
    assetName: "Tủ quần áo 3 buồng",
    assetCategory: "Nội thất",
    description: "",
    aliases: ["tu quan ao 3 buong", "tu quan ao"],
  },
  {
    assetName: "Bàn học",
    assetCategory: "Nội thất",
    description: "",
    aliases: ["ban hoc"],
  },
  {
    assetName: "Giường đôi/tầng + Dát giường",
    assetCategory: "Nội thất",
    description: "",
    aliases: [
      "giuong doi/tang + dat giuong",
      "giuong doi",
      "giuong tang",
      "giuong",
    ],
  },
  {
    assetName: "Cửa đi + cửa sổ",
    assetCategory: "Cơ sở hạ tầng",
    description: "",
    aliases: ["cua di + cua so", "cua di", "cua so"],
  },
  {
    assetName: "Modem Internet",
    assetCategory: "Thiết bị điện tử",
    description: "",
    aliases: ["modem internet", "modem", "bo phat wifi"],
  },
  {
    assetName: "Hệ thống điện: công tắc, ổ cắm, bóng điện",
    assetCategory: "Cơ sở hạ tầng",
    description: "",
    aliases: [
      "he thong dien: cong tac, o cam, bong dien",
      "he thong dien",
      "cong tac",
      "o cam",
      "bong dien",
    ],
  },
];

const CONDITION_PRIORITY = {
  GOOD: 0,
  ATTENTION: 1,
  BROKEN: 2,
  MISSING: 3,
};

function normalizeAssetKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createTemplateRow(definition) {
  return {
    id: null,
    assetName: definition.assetName,
    assetCategory: definition.assetCategory,
    quantity: 1,
    currentCondition: "GOOD",
    description: definition.description,
    fileImageId: null,
    imageFile: null,
    imageUrl: "",
    sourceAssets: [],
  };
}

function getMostSevereCondition(rows) {
  return rows.reduce((current, row) => {
    const candidate = row.currentCondition ?? "GOOD";
    return (CONDITION_PRIORITY[candidate] ?? 0) >
      (CONDITION_PRIORITY[current] ?? 0)
      ? candidate
      : current;
  }, "GOOD");
}

export function createDefaultHandoverAssets() {
  return ASSET_DEFINITIONS.map(createTemplateRow);
}

export function mergeHandoverAssets(systemAssets = []) {
  const rows = Array.isArray(systemAssets) ? systemAssets : [];
  const usedIndexes = new Set();

  const canonicalRows = ASSET_DEFINITIONS.map((definition) => {
    const matchingRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => {
        if (usedIndexes.has(index)) return false;
        const rowKey = normalizeAssetKey(row.assetName);
        return definition.aliases.some(
          (alias) => normalizeAssetKey(alias) === rowKey,
        );
      });

    if (matchingRows.length === 0) return createTemplateRow(definition);

    matchingRows.forEach(({ index }) => usedIndexes.add(index));
    const exactCanonicalKey = normalizeAssetKey(definition.assetName);
    const primary =
      matchingRows.find(
        ({ row }) => normalizeAssetKey(row.assetName) === exactCanonicalKey,
      )?.row ??
      matchingRows.find(({ row }) => row.imageUrl || row.fileImageId)?.row ??
      matchingRows[0].row;
    const sourceAssets = matchingRows.map(({ row }) => ({ ...row }));
    const rowWithDescription =
      matchingRows.find(({ row }) => String(row.description ?? "").trim())
        ?.row ?? primary;
    const rowWithImage =
      matchingRows.find(({ row }) => row.imageUrl || row.fileImageId)?.row ??
      primary;

    return {
      ...createTemplateRow(definition),
      ...primary,
      assetName: definition.assetName,
      assetCategory: definition.assetCategory,
      quantity: Number(primary.quantity) > 0 ? Number(primary.quantity) : 1,
      currentCondition: getMostSevereCondition(sourceAssets),
      description:
        rowWithDescription.description?.trim() || definition.description,
      fileImageId: rowWithImage.fileImageId ?? null,
      imageUrl: rowWithImage.imageUrl ?? "",
      sourceAssets,
    };
  });

  const extraRows = rows
    .filter((_, index) => !usedIndexes.has(index))
    .map((row) => ({ ...row, sourceAssets: [{ ...row }] }));

  return [...canonicalRows, ...extraRows];
}
