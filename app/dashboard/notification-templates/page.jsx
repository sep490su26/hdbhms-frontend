"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BellRing,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Redo2,
  RefreshCcw,
  Save,
  Search,
  Send,
  Undo2,
  Users,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { fetchSimpleProperties } from "@/services/identityAccessService";
import { fetchFloors, fetchRooms } from "@/services/floorRoomService";
import {
  fetchNotificationTemplateDefinitions,
  fetchNotificationTemplates,
  previewNotificationBroadcastRecipients,
  previewNotificationTemplate,
  resetNotificationTemplate,
  sendNotificationBroadcast,
  updateNotificationTemplate,
} from "@/services/notificationsService";

const CHANNEL_OPTIONS = [
  { value: "WEB", label: "Web" },
  { value: "PUSH", label: "Mobile push" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];

const ROLE_OPTIONS = [
  { value: "TENANT", label: "Khách thuê" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "ACCOUNTANT", label: "Kế toán" },
  { value: "OWNER", label: "Chủ trọ" },
];

const STAFF_ROLE_VALUES = new Set(["MANAGER", "ACCOUNTANT", "OWNER"]);

function allowedBroadcastChannelsForRoles(roles = []) {
  const selectedRoles = roles.map((role) => String(role || "").toUpperCase());
  return CHANNEL_OPTIONS.filter((channel) => {
    if (selectedRoles.includes("TENANT") && channel.value === "WEB") return false;
    if (selectedRoles.some((role) => STAFF_ROLE_VALUES.has(role)) && channel.value === "PUSH") return false;
    return true;
  });
}

function channelDisabledReason(channelValue, roles = []) {
  const selectedRoles = roles.map((role) => String(role || "").toUpperCase());
  if (channelValue === "WEB" && selectedRoles.includes("TENANT")) {
    return "Khách thuê không nhận kênh Web.";
  }
  if (channelValue === "PUSH" && selectedRoles.some((role) => STAFF_ROLE_VALUES.has(role))) {
    return "Nhóm staff không nhận Mobile push.";
  }
  return "";
}

const SCOPE_OPTIONS = [
  { value: "SYSTEM", label: "Toàn hệ thống" },
  { value: "ROLE", label: "Theo vai trò" },
  { value: "PROPERTY", label: "Theo cơ sở" },
  { value: "FLOOR", label: "Theo tầng" },
  { value: "ROOM", label: "Theo phòng" },
];

const TEMPLATE_FIELD_LABELS = {
  titleTemplate: "tiêu đề",
  bodyTemplate: "nội dung",
};

const TEMPLATE_TOKEN_PATTERN = /\[\[\$\{[A-Za-z_][A-Za-z0-9_]*\}\]\]/g;
const TEMPLATE_HISTORY_LIMIT = 80;

const EVENT_TEXTS = {
  ROOM_TRANSFER_HOLDER_NOMINATION_REQUESTED: {
    displayName: "Đề cử người đại diện phòng mới",
    description:
      "Gửi cho người được đề cử làm người đại diện phòng mới khi người hiện tại chuyển đi.",
  },
  ROOM_TRANSFER_TARGET_HOLDER_APPROVAL_REQUESTED: {
    displayName: "Xác nhận người chuyển vào phòng",
    description:
      "Gửi cho người đại diện phòng đích khi có người muốn chuyển vào phòng của họ.",
  },
  ROOM_TRANSFER_MANAGER_ACTION_REQUIRED: {
    displayName: "Yêu cầu chuyển phòng cần quản lý xử lý",
    description:
      "Gửi cho quản lý hoặc chủ trọ khi yêu cầu chuyển phòng cần thao tác tiếp theo.",
  },
  TENANT_PROFILE_ACCESS_REQUESTED: {
    displayName: "Yêu cầu xem hồ sơ khách thuê",
    description:
      "Gửi cho chủ trọ khi quản lý yêu cầu quyền xem hồ sơ khách thuê.",
  },
  TENANT_PROFILE_ACCESS_APPROVED: {
    displayName: "Đã được duyệt xem hồ sơ",
    description:
      "Gửi cho quản lý khi chủ trọ duyệt quyền xem hồ sơ khách thuê.",
  },
  TENANT_PROFILE_ACCESS_REJECTED: {
    displayName: "Yêu cầu xem hồ sơ bị từ chối",
    description:
      "Gửi cho quản lý khi chủ trọ từ chối quyền xem hồ sơ khách thuê.",
  },
  VISIT_REQUEST_CREATED: {
    displayName: "Khách đặt lịch xem phòng",
    description:
      "Gửi cho chủ trọ và quản lý khi có khách đặt lịch xem phòng.",
  },
  DEBT_DIRECT_VISIT_REQUIRED: {
    displayName: "Cần gặp trực tiếp khách thuê nợ quá hạn",
    description:
      "Gửi cho chủ trọ hoặc quản lý khi phòng nợ quá hạn cần gặp trực tiếp.",
  },
  PRE_CREATED_ACCOUNT_NOTIFICATION: {
    displayName: "Thông báo tài khoản khách thuê tạo sẵn",
    description:
      "Gửi Email/SMS thông tin tài khoản tạo sẵn cho khách thuê.",
  },
};

const TARGET_TYPE_LABELS = {
  BROADCAST: "Thông báo hàng loạt",
  CHANGE_REQUEST: "Yêu cầu thay đổi",
  MANAGER_TASK: "Tác vụ quản lý",
  ROOM_TRANSFER: "Chuyển phòng",
  TENANT_ACCOUNT_PROVISIONING: "Tài khoản khách thuê",
  TENANT_PROFILE: "Hồ sơ khách thuê",
  VISIT_REQUEST: "Khách xem phòng",
};

const VARIABLE_LABELS = {
  actionLabel: "Thao tác cần xử lý",
  actionType: "Loại thao tác",
  contractCode: "Mã hợp đồng",
  contractId: "ID hợp đồng",
  dueDate: "Hạn xử lý",
  expectedTransferDate: "Ngày chuyển dự kiến",
  loginIdentifier: "Tên đăng nhập",
  managerId: "ID quản lý",
  managerName: "Tên quản lý",
  nominatedHolderProfileId: "ID người đại diện mới",
  nominatorUserId: "ID người đề cử",
  oldRoomId: "ID phòng cũ",
  oldRoomName: "Phòng cũ",
  notes: "Ghi chú",
  preferredStart: "Thời gian hẹn xem",
  profileId: "ID hồ sơ",
  propertyId: "ID cơ sở",
  propertyName: "Tên cơ sở",
  reason: "Lý do",
  recipientEmail: "Email người nhận",
  recipientPhone: "SĐT người nhận",
  recipientProfileId: "ID hồ sơ người nhận",
  requestCode: "Mã yêu cầu",
  requestId: "ID yêu cầu",
  requestedTransferDate: "Ngày yêu cầu chuyển",
  requesterUserId: "ID người yêu cầu",
  resolutionNote: "Ghi chú xử lý",
  roomName: "Tên phòng",
  roomId: "ID phòng",
  supportContact: "Liên hệ hỗ trợ",
  targetRoute: "Đường dẫn xử lý",
  targetContractId: "ID hợp đồng phòng mới",
  targetRoomId: "ID phòng mới",
  targetRoomName: "Phòng mới",
  tenantName: "Tên khách thuê",
  tenantProfileIds: "Danh sách hồ sơ khách thuê",
  totalDebt: "Tổng nợ",
  visitRequestId: "ID lịch xem phòng",
  visitorEmail: "Email khách xem",
  visitorName: "Tên khách xem",
  visitorPhone: "SĐT khách xem",
};

const EMPTY_BROADCAST_FORM = {
  scopeType: "SYSTEM",
  propertyId: "",
  floorId: "",
  roomIds: [],
  roles: ["TENANT"],
  channels: ["EMAIL"],
  title: "",
  body: "",
};

function getErrorMessage(error) {
  return (
    error?.details ||
    error?.message ||
    "Không thể xử lý yêu cầu. Vui lòng thử lại."
  );
}

function optionLabel(options, value) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function localizeDefinition(definition) {
  const text = EVENT_TEXTS[definition.eventType] ?? {};
  return {
    ...definition,
    displayName: text.displayName ?? definition.displayName ?? definition.eventType,
    description: text.description ?? definition.description ?? "",
    targetLabel:
      TARGET_TYPE_LABELS[definition.targetType] ??
      definition.targetType ??
      "Thông báo",
  };
}

function templateVariableToken(name) {
  return `[[\${${name}}]]`;
}

function templateVariableName(token) {
  return String(token || "").slice(4, -3);
}

function sameTemplateForm(left, right) {
  return (
    left?.titleTemplate === right?.titleTemplate &&
    left?.bodyTemplate === right?.bodyTemplate &&
    left?.status === right?.status
  );
}

function templateTokenRanges(value) {
  return [...String(value || "").matchAll(TEMPLATE_TOKEN_PATTERN)].map(
    (match) => ({
      start: match.index,
      end: match.index + match[0].length,
      value: match[0],
    }),
  );
}

function expandRangeToTemplateTokens(value, start, end) {
  let nextStart = start;
  let nextEnd = end;
  let touchedToken = false;

  templateTokenRanges(value).forEach((token) => {
    if (nextStart < token.end && nextEnd > token.start) {
      nextStart = Math.min(nextStart, token.start);
      nextEnd = Math.max(nextEnd, token.end);
      touchedToken = true;
    }
  });

  return touchedToken ? { start: nextStart, end: nextEnd } : null;
}

function templateTokenDeletionRange(value, range, event) {
  if (range.start !== range.end) {
    return expandRangeToTemplateTokens(value, range.start, range.end);
  }

  const caret = range.start;
  const wordDelete = event.ctrlKey || event.metaKey || event.altKey;

  if (wordDelete) {
    if (event.key === "Backspace") {
      let start = caret;
      while (start > 0 && /\s/.test(value[start - 1])) start -= 1;
      while (start > 0 && !/\s/.test(value[start - 1])) start -= 1;
      return expandRangeToTemplateTokens(value, start, caret);
    }

    if (event.key === "Delete") {
      let end = caret;
      while (end < value.length && /\s/.test(value[end])) end += 1;
      while (end < value.length && !/\s/.test(value[end])) end += 1;
      return expandRangeToTemplateTokens(value, caret, end);
    }
  }

  return templateTokenRanges(value).find((token) =>
    event.key === "Backspace"
      ? caret > token.start && caret <= token.end
      : caret >= token.start && caret < token.end,
  );
}

function variableLabel(name) {
  return VARIABLE_LABELS[name] ?? name;
}

function tokenChip(token) {
  const chip = document.createElement("span");
  const variableName = templateVariableName(token);
  chip.contentEditable = "false";
  chip.dataset.templateToken = token;
  chip.title = token;
  chip.className =
    "mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 align-baseline text-[1.02em] font-medium leading-5 text-sky-900";

  const label = document.createElement("span");
  label.className = "truncate";
  label.textContent = variableLabel(variableName);
  chip.appendChild(label);

  const remove = document.createElement("span");
  remove.role = "button";
  remove.tabIndex = -1;
  remove.dataset.templateTokenRemove = "true";
  remove.ariaLabel = `Xóa ${variableLabel(variableName)}`;
  remove.className =
    "grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-full text-[11px] font-medium leading-none text-sky-700 hover:bg-sky-200";
  remove.textContent = "x";
  chip.appendChild(remove);

  return chip;
}

function renderTemplateEditorValue(root, value) {
  root.replaceChildren();
  const text = String(value || "");
  const ranges = templateTokenRanges(text);
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start > cursor) {
      root.appendChild(document.createTextNode(text.slice(cursor, range.start)));
    }
    root.appendChild(tokenChip(range.value));
    cursor = range.end;
  });

  if (cursor < text.length) {
    root.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

function rawLength(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.length;
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;
  if (node.dataset?.templateToken) return node.dataset.templateToken.length;
  if (node.nodeName === "BR") return "\n".length;
  return [...node.childNodes].reduce((sum, child) => sum + rawLength(child), 0);
}

function serializeTemplateEditor(root) {
  return [...root.childNodes]
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (node.dataset?.templateToken) return node.dataset.templateToken;
      if (node.nodeName === "BR") return "\n";
      return node.textContent || "";
    })
    .join("")
    .replace(/\u00a0/g, " ");
}

function rawOffsetInEditor(root, target, offset) {
  let total = 0;
  let found = false;

  function walk(node) {
    if (found) return;
    if (node === target) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += offset;
      } else {
        [...node.childNodes].slice(0, offset).forEach((child) => {
          total += rawLength(child);
        });
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      total += node.nodeValue.length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.dataset?.templateToken) {
      total += node.dataset.templateToken.length;
      return;
    }

    [...node.childNodes].forEach(walk);
  }

  walk(root);
  return total;
}

function selectionRawRange(root) {
  const selection = window.getSelection();
  const fallback = serializeTemplateEditor(root).length;
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) {
    return { start: fallback, end: fallback };
  }

  const start = rawOffsetInEditor(
    root,
    selection.anchorNode,
    selection.anchorOffset,
  );
  const end = rawOffsetInEditor(
    root,
    selection.focusNode,
    selection.focusOffset,
  );
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function setEditorCaretByRawOffset(root, offset) {
  const range = document.createRange();
  const selection = window.getSelection();
  let cursor = 0;

  for (const child of root.childNodes) {
    const length = rawLength(child);
    if (offset <= cursor + length) {
      if (child.nodeType === Node.TEXT_NODE) {
        range.setStart(child, Math.max(0, offset - cursor));
      } else {
        const childIndex = [...root.childNodes].indexOf(child);
        range.setStart(root, offset <= cursor ? childIndex : childIndex + 1);
      }
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    cursor += length;
  }

  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function formatSampleValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function StatusBadge({ status }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Đang bật" : "Tạm tắt"}
    </span>
  );
}

function SourceBadge({ source }) {
  const custom = source === "CUSTOM";
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${
        custom ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {custom ? "Đã tùy chỉnh" : "Mặc định"}
    </span>
  );
}

function TogglePill({ active, disabled = false, multi = false, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-[#1e40af] bg-[#1e40af] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#1e40af] hover:text-[#1e40af]"
      }`}
    >
      {multi && active ? <Check className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

const TemplateTokenEditor = forwardRef(function TemplateTokenEditor(
  {
    value,
    field,
    multiline = false,
    placeholder,
    onChange,
    onCursorChange,
    onUndo,
    onRedo,
  },
  ref,
) {
  const editorRef = useRef(null);
  const lastProgrammaticValueRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusAt(position) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      setEditorCaretByRawOffset(
        editor,
        Math.min(position ?? serializeTemplateEditor(editor).length, serializeTemplateEditor(editor).length),
      );
    },
  }));

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (serializeTemplateEditor(editor) !== String(value || "")) {
      renderTemplateEditorValue(editor, value);
    }
  }, [value]);

  function commit(nextValue, caretOffset, previousCaretOffset = caretOffset) {
    const editor = editorRef.current;
    if (!editor) return;

    lastProgrammaticValueRef.current = nextValue;
    renderTemplateEditorValue(editor, nextValue);
    setEditorCaretByRawOffset(editor, caretOffset);
    onCursorChange(field, caretOffset);
    onChange(nextValue, caretOffset, previousCaretOffset);
  }

  function commitFromDom() {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeTemplateEditor(editor);
    const range = selectionRawRange(editor);
    if (nextValue === lastProgrammaticValueRef.current) {
      lastProgrammaticValueRef.current = null;
      onCursorChange(field, range.start);
      return;
    }
    lastProgrammaticValueRef.current = null;
    onCursorChange(field, range.start);
    onChange(nextValue, range.start, range.start);
  }

  function insertPlainText(text) {
    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = serializeTemplateEditor(editor);
    const range = selectionRawRange(editor);
    const nextValue = `${currentValue.slice(0, range.start)}${text}${currentValue.slice(range.end)}`;
    commit(nextValue, range.start + text.length, range.start);
  }

  function deleteTokenElement(tokenElement) {
    const editor = editorRef.current;
    if (!editor || !tokenElement) return;
    let start = 0;
    for (const child of editor.childNodes) {
      if (child === tokenElement) break;
      start += rawLength(child);
    }
    const token = tokenElement.dataset.templateToken || "";
    const currentValue = serializeTemplateEditor(editor);
    commit(
      `${currentValue.slice(0, start)}${currentValue.slice(start + token.length)}`,
      start,
      start,
    );
  }

  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey) {
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        onRedo();
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (multiline) insertPlainText("\n");
      return;
    }

    if (event.key !== "Backspace" && event.key !== "Delete") return;

    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = serializeTemplateEditor(editor);
    const range = selectionRawRange(editor);
    const deleteRange = templateTokenDeletionRange(currentValue, range, event);
    if (!deleteRange) return;

    event.preventDefault();
    commit(
      `${currentValue.slice(0, deleteRange.start)}${currentValue.slice(deleteRange.end)}`,
      deleteRange.start,
      range.start,
    );
  }

  return (
    <div className="relative">
      {!value ? (
        <div
          className={`pointer-events-none absolute left-3 z-0 text-sm font-medium text-slate-400 ${
            multiline ? "top-3" : "top-1/2 -translate-y-1/2"
          }`}
        >
          {placeholder}
        </div>
      ) : null}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline={multiline}
        suppressContentEditableWarning
        onBlur={commitFromDom}
        onInput={commitFromDom}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const editor = editorRef.current;
          if (!editor) return;
          const range = selectionRawRange(editor);
          onCursorChange(field, range.start);
        }}
        onMouseDown={(event) => {
          const removeButton = event.target.closest("[data-template-token-remove]");
          if (removeButton) {
            event.preventDefault();
            event.stopPropagation();
            deleteTokenElement(removeButton.closest("[data-template-token]"));
            return;
          }

          const tokenElement = event.target.closest("[data-template-token]");
          const editor = editorRef.current;
          if (!tokenElement || !editor) return;

          event.preventDefault();
          let start = 0;
          for (const child of editor.childNodes) {
            if (child === tokenElement) break;
            start += rawLength(child);
          }
          const rect = tokenElement.getBoundingClientRect();
          const offset =
            event.clientX < rect.left + rect.width / 2
              ? start
              : start + rawLength(tokenElement);
          editor.focus();
          setEditorCaretByRawOffset(editor, offset);
          onCursorChange(field, offset);
        }}
        onMouseUp={() => {
          requestAnimationFrame(() => {
            const editor = editorRef.current;
            if (!editor || document.activeElement !== editor) return;
            const range = selectionRawRange(editor);
            onCursorChange(field, range.start);
          });
        }}
        onPaste={(event) => {
          event.preventDefault();
          insertPlainText(event.clipboardData.getData("text/plain"));
        }}
        className={`relative z-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 ${
          multiline
            ? "min-h-[12rem] whitespace-pre-wrap break-words py-3 leading-6"
            : "min-h-11 overflow-x-auto whitespace-pre py-2.5"
        }`}
      />
    </div>
  );
});

function SelectionLabel({ children, note }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FieldLabel>{children}</FieldLabel>
      {note ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
          {note}
        </span>
      ) : null}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
      {children}
    </span>
  );
}

export default function NotificationTemplatesPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const titleTemplateRef = useRef(null);
  const bodyTemplateRef = useRef(null);
  const templateSelectionRef = useRef({
    titleTemplate: { start: 0, end: 0 },
    bodyTemplate: { start: 0, end: 0 },
  });
  const [definitions, setDefinitions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [activeTemplateField, setActiveTemplateField] =
    useState("bodyTemplate");
  const [templateHistory, setTemplateHistory] = useState({
    past: [],
    future: [],
  });
  const [form, setForm] = useState({
    titleTemplate: "",
    bodyTemplate: "",
    status: "ACTIVE",
  });
  const formRef = useRef(form);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [broadcastForm, setBroadcastForm] = useState(EMPTY_BROADCAST_FORM);
  const [properties, setProperties] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [previewingRecipients, setPreviewingRecipients] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const selectedChannel = selectedChannels[0] ?? "";
  const canUndoTemplate = templateHistory.past.length > 0;
  const canRedoTemplate = templateHistory.future.length > 0;

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setLoading(true);
      setError("");
      try {
        const [definitionData, templateData, propertyData] = await Promise.all([
          fetchNotificationTemplateDefinitions(),
          fetchNotificationTemplates(),
          fetchSimpleProperties().catch(() => []),
        ]);

        if (!active) return;

        setDefinitions(definitionData);
        setTemplates(templateData);
        setProperties(propertyData);

        const firstEventType = definitionData[0]?.eventType ?? "";
        const firstAllowedChannels = (definitionData[0]?.allowedChannels ?? []).filter(
          (channel) => channel !== "IN_APP",
        );
        const firstChannel =
          firstAllowedChannels[0] ??
          templateData.find(
            (item) => item.eventType === firstEventType && item.channel !== "IN_APP",
          )?.channel ??
          "";
        const firstTemplate =
          templateData.find(
            (item) =>
              item.eventType === firstEventType && item.channel === firstChannel,
          ) ?? null;

        setSelectedEventType(firstEventType);
        setSelectedChannels(firstChannel ? [firstChannel] : []);
        const initialForm = {
          titleTemplate: firstTemplate?.titleTemplate ?? "",
          bodyTemplate: firstTemplate?.bodyTemplate ?? "",
          status: firstTemplate?.status ?? "ACTIVE",
        };
        formRef.current = initialForm;
        setForm(initialForm);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedEventType) return;

    let active = true;

    async function loadTemplates() {
      setTemplatesLoading(true);
      setError("");
      try {
        const data = await fetchNotificationTemplates({
          eventType: selectedEventType,
        });
        if (active) setTemplates(data);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setTemplatesLoading(false);
      }
    }

    loadTemplates();

    return () => {
      active = false;
    };
  }, [selectedEventType]);

  useEffect(() => {
    if (!broadcastForm.propertyId) {
      queueMicrotask(() => {
        setFloors([]);
        setRooms([]);
      });
      return;
    }

    let active = true;

    async function loadScopeCatalog() {
      setScopeLoading(true);
      try {
        const [floorData, roomData] = await Promise.all([
          fetchFloors(broadcastForm.propertyId),
          fetchRooms(broadcastForm.propertyId),
        ]);
        if (!active) return;
        setFloors(floorData);
        setRooms(roomData);
      } catch {
        if (!active) return;
        setFloors([]);
        setRooms([]);
      } finally {
        if (active) setScopeLoading(false);
      }
    }

    loadScopeCatalog();

    return () => {
      active = false;
    };
  }, [broadcastForm.propertyId]);

  const localizedDefinitions = useMemo(
    () => definitions.map(localizeDefinition),
    [definitions],
  );

  const filteredDefinitions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return localizedDefinitions;

    return localizedDefinitions.filter((definition) =>
      [
        definition.eventType,
        definition.displayName,
        definition.description,
        definition.targetLabel,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [localizedDefinitions, searchTerm]);

  const selectedDefinition = useMemo(
    () =>
      localizedDefinitions.find(
        (definition) => definition.eventType === selectedEventType,
      ) ?? null,
    [localizedDefinitions, selectedEventType],
  );

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.eventType === selectedEventType &&
          template.channel === selectedChannel,
      ) ?? null,
    [templates, selectedChannel, selectedEventType],
  );

  const channels = (selectedDefinition?.allowedChannels ?? []).filter(
    (channel) => channel !== "IN_APP",
  );
  const variables = selectedDefinition?.variables ?? [];
  const sampleEntries = Object.entries(selectedDefinition?.sampleData ?? {});

  useEffect(() => {
    if (!selectedDefinition) return;

    const allowedChannels = (selectedDefinition.allowedChannels ?? []).filter(
      (channel) => channel !== "IN_APP",
    );
    const validChannels = selectedChannels.filter((channel) =>
      allowedChannels.includes(channel),
    );
    const nextChannels =
      validChannels.length > 0
        ? validChannels
        : allowedChannels[0]
          ? [allowedChannels[0]]
          : [];
    const unchanged =
      nextChannels.length === selectedChannels.length &&
      nextChannels.every((channel, index) => channel === selectedChannels[index]);

    if (!unchanged) {
      queueMicrotask(() => setSelectedChannels(nextChannels));
    }
  }, [selectedChannels, selectedDefinition]);

  useEffect(() => {
    queueMicrotask(() => {
      const nextForm = {
        titleTemplate: selectedTemplate?.titleTemplate ?? "",
        bodyTemplate: selectedTemplate?.bodyTemplate ?? "",
        status: selectedTemplate?.status ?? "ACTIVE",
      };
      formRef.current = nextForm;
      setForm(nextForm);
      setTemplateHistory({ past: [], future: [] });
      setPreview(null);
      setNotice("");
    });
  }, [selectedTemplate]);

  const filteredRooms = useMemo(() => {
    if (!broadcastForm.floorId) return rooms;
    return rooms.filter((room) => String(room.floorId) === String(broadcastForm.floorId));
  }, [broadcastForm.floorId, rooms]);

  const broadcastScopeIds = useMemo(() => {
    if (broadcastForm.scopeType === "PROPERTY") {
      return broadcastForm.propertyId ? [broadcastForm.propertyId] : [];
    }
    if (broadcastForm.scopeType === "FLOOR") {
      return broadcastForm.floorId ? [broadcastForm.floorId] : [];
    }
    if (broadcastForm.scopeType === "ROOM") {
      return broadcastForm.roomIds;
    }
    return [];
  }, [broadcastForm.floorId, broadcastForm.propertyId, broadcastForm.roomIds, broadcastForm.scopeType]);

  const broadcastScopeReady = useMemo(() => {
    if (["SYSTEM", "ROLE"].includes(broadcastForm.scopeType)) return true;
    return broadcastScopeIds.length > 0;
  }, [broadcastForm.scopeType, broadcastScopeIds.length]);

  const effectiveBroadcastRoles = useMemo(() => {
    if (broadcastForm.scopeType === "ROLE") return broadcastForm.roles;
    if (["FLOOR", "ROOM"].includes(broadcastForm.scopeType)) return ["TENANT"];
    return [];
  }, [broadcastForm.roles, broadcastForm.scopeType]);

  const allowedBroadcastChannels = useMemo(
    () => allowedBroadcastChannelsForRoles(effectiveBroadcastRoles),
    [effectiveBroadcastRoles],
  );

  const allowedBroadcastChannelValues = useMemo(
    () => new Set(allowedBroadcastChannels.map((channel) => channel.value)),
    [allowedBroadcastChannels],
  );

  const sanitizedBroadcastChannels = useMemo(
    () => broadcastForm.channels.filter((channel) => allowedBroadcastChannelValues.has(channel)),
    [allowedBroadcastChannelValues, broadcastForm.channels],
  );

  const broadcastPayload = useMemo(
    () => ({
      scopeType: broadcastForm.scopeType,
      scopeIds: broadcastScopeIds,
      roles: effectiveBroadcastRoles,
      channels: sanitizedBroadcastChannels,
      title: broadcastForm.title,
      body: broadcastForm.body,
    }),
    [broadcastForm, broadcastScopeIds, effectiveBroadcastRoles, sanitizedBroadcastChannels],
  );

  const canSendBroadcast =
    broadcastScopeReady &&
    (broadcastForm.scopeType !== "ROLE" || effectiveBroadcastRoles.length > 0) &&
    sanitizedBroadcastChannels.length > 0 &&
    broadcastForm.title.trim().length > 0 &&
    broadcastForm.body.trim().length > 0;

  function selectDefinition(definition) {
    setSelectedEventType(definition.eventType);
    setSelectedChannels(
      definition.allowedChannels?.find((channel) => channel !== "IN_APP")
        ? [definition.allowedChannels.find((channel) => channel !== "IN_APP")]
        : [],
    );
    setPreview(null);
    setNotice("");
  }

  function toggleTemplateChannel(channel) {
    setSelectedChannels((current) => {
      if (current.includes(channel)) {
        return current.length > 1
          ? current.filter((item) => item !== channel)
          : current;
      }
      return [...current, channel];
    });
    setPreview(null);
    setNotice("");
  }

  function rememberTemplateSelection(field, element) {
    const offset =
      typeof element === "number"
        ? element
        : element.selectionStart ?? element.value.length;
    templateSelectionRef.current[field] = { start: offset, end: offset };
    setActiveTemplateField(field);
  }

  function commitTemplateForm(nextForm, historyMeta = {}) {
    const currentForm = formRef.current;
    if (sameTemplateForm(currentForm, nextForm)) return;

    const field = historyMeta.field ?? activeTemplateField;
    const beforeCaret =
      historyMeta.beforeCaret ??
      templateSelectionRef.current[field]?.start ??
      currentForm[field]?.length ??
      0;
    const afterCaret =
      historyMeta.afterCaret ??
      templateSelectionRef.current[field]?.start ??
      nextForm[field]?.length ??
      0;
    const edit = {
      before: currentForm,
      after: nextForm,
      field,
      beforeCaret,
      afterCaret,
    };

    formRef.current = nextForm;
    setTemplateHistory((current) => ({
      past: [...current.past, edit].slice(-TEMPLATE_HISTORY_LIMIT),
      future: [],
    }));
    setForm(nextForm);
    setPreview(null);
  }

  function focusTemplateField(field, position) {
    const element =
      field === "titleTemplate" ? titleTemplateRef.current : bodyTemplateRef.current;
    if (!element) return;
    const nextPosition =
      position ??
      templateSelectionRef.current[field]?.start ??
      formRef.current[field]?.length ??
      0;
    requestAnimationFrame(() => element.focusAt(nextPosition));
    templateSelectionRef.current[field] = {
      start: nextPosition,
      end: nextPosition,
    };
    setActiveTemplateField(field);
  }

  function undoTemplateChange() {
    const edit = templateHistory.past.at(-1);
    if (!edit) return;

    const previous = edit.before ?? edit;
    const field = edit.field ?? activeTemplateField;
    const caret =
      edit.beforeCaret ??
      templateSelectionRef.current[field]?.start ??
      previous[field]?.length ??
      0;
    formRef.current = previous;
    setTemplateHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [edit, ...current.future].slice(0, TEMPLATE_HISTORY_LIMIT),
    }));
    setForm(previous);
    setPreview(null);
    focusTemplateField(field, caret);
  }

  function redoTemplateChange() {
    const edit = templateHistory.future[0];
    if (!edit) return;

    const next = edit.after ?? edit;
    const field = edit.field ?? activeTemplateField;
    const caret =
      edit.afterCaret ??
      templateSelectionRef.current[field]?.start ??
      next[field]?.length ??
      0;
    formRef.current = next;
    setTemplateHistory((current) => ({
      past: [...current.past, edit].slice(-TEMPLATE_HISTORY_LIMIT),
      future: current.future.slice(1),
    }));
    setForm(next);
    setPreview(null);
    focusTemplateField(field, caret);
  }

  function commitTemplateField(field, nextValue, caretOffset, previousCaretOffset) {
    rememberTemplateSelection(field, caretOffset ?? nextValue.length);
    commitTemplateForm(
      { ...formRef.current, [field]: nextValue },
      {
        field,
        beforeCaret: previousCaretOffset ?? caretOffset ?? nextValue.length,
        afterCaret: caretOffset ?? nextValue.length,
      },
    );
  }

  function insertTemplateVariable(variableName) {
    const field =
      activeTemplateField === "titleTemplate" ? "titleTemplate" : "bodyTemplate";
    const token = templateVariableToken(variableName);
    const currentForm = formRef.current;
    const currentValue = currentForm[field] ?? "";
    const selection = templateSelectionRef.current[field] ?? {};
    const start = Math.min(selection.start ?? currentValue.length, currentValue.length);
    const end = Math.min(selection.end ?? start, currentValue.length);
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    const nextPosition = start + token.length;

    templateSelectionRef.current[field] = {
      start: nextPosition,
      end: nextPosition,
    };
    commitTemplateForm(
      { ...currentForm, [field]: nextValue },
      { field, beforeCaret: start, afterCaret: nextPosition },
    );
    focusTemplateField(field, nextPosition);
  }

  async function handleSave() {
    if (!selectedEventType || selectedChannels.length === 0) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updatedTemplates = await Promise.all(
        selectedChannels.map((channel) =>
          updateNotificationTemplate({
            eventType: selectedEventType,
            channel,
            titleTemplate: form.titleTemplate,
            bodyTemplate: form.bodyTemplate,
            status: form.status,
          }),
        ),
      );
      setTemplates((current) => [
        ...current.filter(
          (item) =>
            !(
              item.eventType === selectedEventType &&
              selectedChannels.includes(item.channel)
            ),
        ),
        ...updatedTemplates,
      ]);
      setNotice(`Đã lưu mẫu cho ${updatedTemplates.length} kênh.`);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selectedEventType || selectedChannels.length === 0) return;

    setResetting(true);
    setError("");
    setNotice("");
    try {
      const resetTemplates = await Promise.all(
        selectedChannels.map((channel) =>
          resetNotificationTemplate({
            eventType: selectedEventType,
            channel,
          }),
        ),
      );
      setTemplates((current) => [
        ...current.filter(
          (item) =>
            !(
              item.eventType === selectedEventType &&
              selectedChannels.includes(item.channel)
            ),
        ),
        ...resetTemplates,
      ]);
      setNotice(`Đã khôi phục mẫu mặc định cho ${resetTemplates.length} kênh.`);
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setResetting(false);
    }
  }

  async function handlePreview() {
    if (!selectedEventType || !selectedChannel) return;

    setPreviewing(true);
    setError("");
    setPreview(null);
    try {
      const result = await previewNotificationTemplate({
        eventType: selectedEventType,
        channel: selectedChannel,
        titleTemplate: form.titleTemplate,
        bodyTemplate: form.bodyTemplate,
        data: selectedDefinition?.sampleData ?? {},
      });
      setPreview(result);
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    } finally {
      setPreviewing(false);
    }
  }

  function updateBroadcastForm(patch) {
    setBroadcastForm((current) => ({ ...current, ...patch }));
    setRecipientPreview(null);
    setNotice("");
  }

  function toggleBroadcastValue(key, value) {
    setBroadcastForm((current) => {
      const values = new Set(current[key]);
      if (values.has(value)) values.delete(value);
      else values.add(value);
      const patch = { [key]: Array.from(values) };
      if (key === "roles") {
        const allowedValues = new Set(allowedBroadcastChannelsForRoles(patch.roles).map((channel) => channel.value));
        patch.channels = current.channels.filter((channel) => allowedValues.has(channel));
      }
      return { ...current, ...patch };
    });
    setRecipientPreview(null);
    setNotice("");
  }

  function handleScopeChange(scopeType) {
    setBroadcastForm((current) => ({
      ...current,
      scopeType,
      floorId: scopeType === "FLOOR" ? current.floorId : "",
      roomIds: scopeType === "ROOM" ? current.roomIds : [],
    }));
    setRecipientPreview(null);
    setNotice("");
  }

  async function handlePreviewRecipients() {
    if (!broadcastScopeReady) {
      setError("Vui lòng chọn đủ phạm vi nhận thông báo.");
      return;
    }

    setPreviewingRecipients(true);
    setError("");
    setNotice("");
    try {
      setRecipientPreview(await previewNotificationBroadcastRecipients(broadcastPayload));
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    } finally {
      setPreviewingRecipients(false);
    }
  }

  async function handleSendBroadcast() {
    if (!canSendBroadcast) {
      setError("Vui lòng nhập tiêu đề, nội dung và chọn phạm vi nhận thông báo.");
      return;
    }

    const estimatedOutboxCount =
      recipientPreview?.outboxCount ??
      `${sanitizedBroadcastChannels.length} kênh x số người nhận`;
    const confirmed = window.confirm(
      `Gửi thông báo hàng loạt này? Hệ thống sẽ tạo ${estimatedOutboxCount} thông báo.`,
    );
    if (!confirmed) return;

    setSendingBroadcast(true);
    setError("");
    setNotice("");
    try {
      const result = await sendNotificationBroadcast(broadcastPayload);
      setRecipientPreview(result);
      setBroadcastForm((current) => ({
        ...current,
        title: "",
        body: "",
      }));
      setNotice(
        `Đã gửi thông báo cho ${result.recipientCount} người nhận (${result.outboxCount} thông báo).`,
      );
    } catch (sendError) {
      setError(getErrorMessage(sendError));
    } finally {
      setSendingBroadcast(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-[#1e40af]" />
          Đang tải cấu hình thông báo...
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 text-slate-900">
      <DashboardPageHeader
        eyebrow="Thông báo"
        title="Quản lý thông báo"
        description="Chỉnh mẫu thông báo hệ thống và gửi thông báo hàng loạt theo vai trò, cơ sở, tầng hoặc phòng."
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold ${
                activeTab === "templates"
                  ? "bg-[#1e40af] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BellRing className="h-4 w-4" />
              Mẫu thông báo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("broadcast")}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold ${
                activeTab === "broadcast"
                  ? "bg-[#1e40af] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Send className="h-4 w-4" />
              Gửi thông báo
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      ) : null}

      {activeTab === "templates" ? (
        <div className="grid min-w-0 items-start gap-5 xl:flex">
          <aside
            className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:w-[320px] xl:min-w-[260px] xl:max-w-[560px] xl:resize-x xl:overflow-auto"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm mẫu thông báo..."
                className="h-11 w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
              />
            </div>

            <div className="mt-4 grid max-h-[calc(100vh-260px)] min-h-[240px] gap-2 overflow-y-auto pr-1">
              {filteredDefinitions.map((definition) => {
                const active = definition.eventType === selectedEventType;
                return (
                  <button
                    key={definition.eventType}
                    type="button"
                    onClick={() => selectDefinition(definition)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-[#1e40af] bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid min-w-0 gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-sm font-black leading-5 text-slate-950">
                          {definition.displayName}
                        </p>
                        <p
                          title={definition.eventType}
                          className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] font-black uppercase leading-4 text-[#1e40af]"
                        >
                          Mã: {definition.eventType}
                        </p>
                      </div>
                      <span className="w-fit max-w-full truncate rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">
                        {definition.targetLabel}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-600">
                      {definition.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(definition.allowedChannels ?? [])
                        .filter((channel) => channel !== "IN_APP")
                        .map((channel) => (
                        <span
                          key={channel}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
                        >
                          {optionLabel(CHANNEL_OPTIONS, channel)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="grid min-w-0 flex-1 gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1e40af]">
                    {selectedDefinition?.targetLabel || "Thông báo"}
                  </p>
                  <h2 className="mt-2 break-words text-xl font-black">
                    {selectedDefinition?.displayName || "Chọn mẫu thông báo"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {selectedDefinition?.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SourceBadge source={selectedTemplate?.source} />
                  <StatusBadge status={form.status} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_220px]">
                <div>
                  <SelectionLabel
                    note={`Chọn nhiều - ${selectedChannels.length}/${channels.length}`}
                  >
                    Kênh gửi
                  </SelectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {channels.map((channel) => (
                      <TogglePill
                        key={channel}
                        active={selectedChannels.includes(channel)}
                        multi
                        onClick={() => toggleTemplateChannel(channel)}
                      >
                        {optionLabel(CHANNEL_OPTIONS, channel)}
                      </TogglePill>
                    ))}
                  </div>
                </div>

                <label>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      commitTemplateForm({
                        ...formRef.current,
                        status: event.target.value,
                      })
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
                  >
                    <option value="ACTIVE">Đang bật</option>
                    <option value="INACTIVE">Tạm tắt</option>
                  </select>
                </label>
              </div>

              {templatesLoading ? (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải template...
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold leading-6 text-slate-600">
                  Biến được hiển thị bằng tên dễ đọc; hệ thống tự lưu đúng định dạng gửi backend.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Hoàn tác (Ctrl+Z)"
                    onClick={undoTemplateChange}
                    disabled={!canUndoTemplate}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#1e40af] hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Làm lại (Ctrl+Y hoặc Ctrl+Shift+Z)"
                    onClick={redoTemplateChange}
                    disabled={!canRedoTemplate}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#1e40af] hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid min-w-0 gap-4">
                  <label>
                    <FieldLabel>Mẫu tiêu đề</FieldLabel>
                    <div className="mt-2">
                      <TemplateTokenEditor
                        ref={titleTemplateRef}
                        field="titleTemplate"
                        value={form.titleTemplate}
                        placeholder="Nhập tiêu đề, hoặc bấm biến ở bên cạnh để chèn"
                        onChange={(nextValue, caretOffset, previousCaretOffset) =>
                          commitTemplateField(
                            "titleTemplate",
                            nextValue,
                            caretOffset,
                            previousCaretOffset,
                          )
                        }
                        onCursorChange={rememberTemplateSelection}
                        onUndo={undoTemplateChange}
                        onRedo={redoTemplateChange}
                      />
                    </div>
                  </label>

                  <label>
                    <FieldLabel>Mẫu nội dung</FieldLabel>
                    <div className="mt-2">
                      <TemplateTokenEditor
                        ref={bodyTemplateRef}
                        field="bodyTemplate"
                        value={form.bodyTemplate}
                        multiline
                        placeholder="Nhập nội dung, hoặc bấm biến ở bên cạnh để chèn"
                        onChange={(nextValue, caretOffset, previousCaretOffset) =>
                          commitTemplateField(
                            "bodyTemplate",
                            nextValue,
                            caretOffset,
                            previousCaretOffset,
                          )
                        }
                        onCursorChange={rememberTemplateSelection}
                        onUndo={undoTemplateChange}
                        onRedo={redoTemplateChange}
                      />
                    </div>
                  </label>
                </div>

                <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-black">Chèn biến</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Đang chèn vào {TEMPLATE_FIELD_LABELS[activeTemplateField]}. Bấm
                    một biến để thêm tên dữ liệu tương ứng.
                  </p>
                  <div className="mt-3 grid max-h-[320px] gap-2 overflow-y-auto pr-1">
                    {variables.length ? (
                      variables.map((variable) => {
                        const sampleValue = formatSampleValue(
                          selectedDefinition?.sampleData?.[variable.name],
                        );
                        return (
                          <button
                            key={variable.name}
                            type="button"
                            onClick={() => insertTemplateVariable(variable.name)}
                            title={`Chèn ${variableLabel(variable.name)}`}
                            className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-[#1e40af] hover:bg-blue-50"
                          >
                            <span className="flex min-w-0 items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-sm font-black text-slate-900">
                                {variableLabel(variable.name)}
                              </span>
                              {variable.required ? (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                  Bắt buộc
                                </span>
                              ) : null}
                            </span>
                            {sampleValue ? (
                              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                                Mẫu: {sampleValue}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm font-semibold text-slate-500">
                        Mẫu này không có biến.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedEventType || selectedChannels.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d3a8a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu template
                </button>

                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing || !selectedEventType || !selectedChannel}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#1e40af] hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Xem trước
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting || !selectedEventType || selectedChannels.length === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Khôi phục mặc định
                </button>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black">Dữ liệu mẫu</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Backend dùng dữ liệu này khi xem trước mẫu thông báo.
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                  {sampleEntries.length ? (
                    sampleEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-[minmax(110px,150px)_minmax(0,1fr)] border-b border-slate-100 text-sm last:border-b-0"
                      >
                        <div className="break-all bg-slate-50 px-3 py-2 font-bold text-slate-600">
                          {key}
                        </div>
                        <div className="break-words px-3 py-2 text-slate-800">
                          {String(value)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500">
                      Không có dữ liệu mẫu.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black">Kết quả xem trước</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Bản xem trước dùng dữ liệu mẫu từ backend.
                </p>
                {preview ? (
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Tiêu đề
                      </p>
                      <p className="mt-2 font-bold text-slate-950">
                        {preview.title}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Nội dung
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                        {preview.body}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    Bấm Xem trước để render tiêu đề và nội dung.
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1e40af]">
                  Thông báo hàng loạt
                </p>
                <h2 className="mt-2 text-xl font-black">
                  Gửi thông báo theo phạm vi
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Tạo thông báo vào hàng đợi gửi theo vai trò, cơ sở, tầng hoặc phòng.
                </p>
              </div>
              <Send className="h-8 w-8 text-[#1e40af]" />
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <FieldLabel>Phạm vi gửi</FieldLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((scope) => (
                    <TogglePill
                      key={scope.value}
                      active={broadcastForm.scopeType === scope.value}
                      onClick={() => handleScopeChange(scope.value)}
                    >
                      {scope.label}
                    </TogglePill>
                  ))}
                </div>
              </div>

              {["PROPERTY", "FLOOR", "ROOM"].includes(broadcastForm.scopeType) ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <label>
                    <FieldLabel>Cơ sở</FieldLabel>
                    <select
                      value={broadcastForm.propertyId}
                      onChange={(event) =>
                        updateBroadcastForm({
                          propertyId: event.target.value,
                          floorId: "",
                          roomIds: [],
                        })
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
                    >
                      <option value="">Chọn cơ sở</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name || property.code}
                        </option>
                      ))}
                    </select>
                  </label>

                  {["FLOOR", "ROOM"].includes(broadcastForm.scopeType) ? (
                    <label>
                      <FieldLabel>Tầng</FieldLabel>
                      <select
                        value={broadcastForm.floorId}
                        onChange={(event) =>
                          updateBroadcastForm({
                            floorId: event.target.value,
                            roomIds: [],
                          })
                        }
                        disabled={!broadcastForm.propertyId || scopeLoading}
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:opacity-60"
                      >
                        <option value="">Chọn tầng</option>
                        {floors.map((floor) => (
                          <option key={floor.id} value={floor.id}>
                            {floor.name || floor.floorCode}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {broadcastForm.scopeType === "ROOM" ? (
                    <label>
                      <FieldLabel>Phòng</FieldLabel>
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            toggleBroadcastValue("roomIds", event.target.value);
                          }
                        }}
                        disabled={!broadcastForm.propertyId || scopeLoading}
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:opacity-60"
                      >
                        <option value="">Thêm phòng</option>
                        {filteredRooms
                          .filter((room) => !broadcastForm.roomIds.includes(String(room.id)))
                          .map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name || `Phòng ${room.roomCode}`}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {broadcastForm.scopeType === "ROOM" && broadcastForm.roomIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {broadcastForm.roomIds.map((roomId) => {
                    const room = rooms.find((item) => String(item.id) === String(roomId));
                    return (
                      <button
                        key={roomId}
                        type="button"
                        onClick={() => toggleBroadcastValue("roomIds", roomId)}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1e40af] hover:bg-blue-100"
                      >
                        {room?.name || room?.roomCode || `Phòng ${roomId}`} x
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className={`grid gap-4 ${broadcastForm.scopeType === "ROLE" ? "lg:grid-cols-2" : ""}`}>
                {broadcastForm.scopeType === "ROLE" ? (
                  <div>
                    <SelectionLabel
                      note={`Chọn nhiều - ${broadcastForm.roles.length}/${ROLE_OPTIONS.length}`}
                    >
                      Vai trò nhận
                    </SelectionLabel>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <TogglePill
                          key={role.value}
                          active={broadcastForm.roles.includes(role.value)}
                          multi
                          onClick={() => toggleBroadcastValue("roles", role.value)}
                        >
                          {role.label}
                        </TogglePill>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <SelectionLabel
                    note={`Chọn nhiều - ${sanitizedBroadcastChannels.length}/${allowedBroadcastChannels.length}`}
                  >
                    Kênh gửi
                  </SelectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const disabledReason = channelDisabledReason(channel.value, effectiveBroadcastRoles);
                      const disabled = Boolean(disabledReason);
                      return (
                        <TogglePill
                          key={channel.value}
                          active={sanitizedBroadcastChannels.includes(channel.value)}
                          multi
                          disabled={disabled}
                          title={disabledReason || undefined}
                          onClick={() => {
                            if (!disabled) toggleBroadcastValue("channels", channel.value);
                          }}
                        >
                          {channel.label}
                        </TogglePill>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                    In-app đã bỏ. Khách thuê không có kênh Web; nhóm staff không có Mobile push.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <label>
                  <FieldLabel>Tiêu đề</FieldLabel>
                  <input
                    value={broadcastForm.title}
                    maxLength={255}
                    onChange={(event) =>
                      updateBroadcastForm({ title: event.target.value })
                    }
                    placeholder="Ví dụ: Tạm ngưng cấp nước tối nay"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
                  />
                </label>

                <label>
                  <FieldLabel>Nội dung</FieldLabel>
                  <textarea
                    value={broadcastForm.body}
                    onChange={(event) =>
                      updateBroadcastForm({ body: event.target.value })
                    }
                    rows={7}
                    placeholder="Nhập nội dung cần gửi đến người nhận..."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePreviewRecipients}
                  disabled={previewingRecipients || !broadcastScopeReady}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#1e40af] hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewingRecipients ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Ước tính người nhận
                </button>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !canSendBroadcast}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d3a8a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingBroadcast ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Gửi thông báo
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black">Tóm tắt phạm vi</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">
                  Phạm vi
                </p>
                <p className="mt-1 font-bold">
                  {optionLabel(SCOPE_OPTIONS, broadcastForm.scopeType)}
                </p>
              </div>
              {effectiveBroadcastRoles.length ? (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Vai trò
                  </p>
                  <p className="mt-1 font-bold">
                    {effectiveBroadcastRoles
                      .map((role) => optionLabel(ROLE_OPTIONS, role))
                      .join(", ")}
                    {["FLOOR", "ROOM"].includes(broadcastForm.scopeType) ? " (mặc định)" : ""}
                  </p>
                </div>
              ) : null}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">
                  Kênh
                </p>
                <p className="mt-1 font-bold">
                  {sanitizedBroadcastChannels
                    .map((channel) => optionLabel(CHANNEL_OPTIONS, channel))
                    .join(", ") || "Chưa chọn"}
                </p>
              </div>
            </div>

            {recipientPreview ? (
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#1e40af]">
                  Ước tính gửi
                </p>
                <p className="mt-3 text-3xl font-black text-[#1e40af]">
                  {recipientPreview.recipientCount}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  người nhận, {recipientPreview.outboxCount} thông báo trong hàng đợi
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-500">
                Bấm Ước tính người nhận để kiểm tra phạm vi trước khi gửi.
              </div>
            )}

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
              Tính năng này tạo thông báo trực tiếp vào hàng đợi gửi. Với kênh
              Push/Email/SMS, bộ xử lý backend sẽ tiếp tục gửi theo cấu hình hệ thống.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
