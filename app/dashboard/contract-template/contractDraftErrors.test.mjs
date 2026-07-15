import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatDraftCreationError } from "./contractDraftErrors.js";

test("draft conflict identifies the pending contract and customer", () => {
  const message = formatDraftCreationError(
    {
      message: "FUTURE_CONTRACT_EXISTS: Phòng đã có hợp đồng tương lai.",
      status: 409,
    },
    { depositAgreementId: 17, roomId: 35, roomCode: "505" },
    [
      {
        leaseContractId: 1,
        depositAgreementId: null,
        roomId: 35,
        contractCode: "DEMO-LEASE-505-DRAFT",
        customerName: "Phạm Gia Hân",
        status: "DRAFT",
      },
    ],
  );

  assert.equal(
    message,
    "Phòng 505 đang có hợp đồng DEMO-LEASE-505-DRAFT của Phạm Gia Hân ở trạng thái chờ xử lý. Vui lòng xử lý hợp đồng này trước rồi thử lại.",
  );
});

test("activation popup replaces the endless spinner with an actionable error", () => {
  const source = readFileSync(
    new URL("./ContractActivationFlow.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Chưa thể tạo hợp đồng thuê/);
  assert.match(source, /draftError/);
  assert.match(source, /Thử tạo lại/);
});
