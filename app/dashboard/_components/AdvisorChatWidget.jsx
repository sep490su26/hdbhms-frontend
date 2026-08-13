"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BotMessageSquare, CalendarDays, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import {
  askAdvisor,
  createAdvisorSession,
  currentAdvisorPeriod,
  fetchAdvisorAnalysis,
  fetchAdvisorSessionHistory,
} from "@/services/advisorService";
import { useAuth } from "../_contexts/AuthContext";
import {
  historyMessages,
  mergeAdvisorMessages,
  resolveAdvisorSessionId,
} from "./advisorChatState";
import { MarkdownContent } from "./MarkdownContent";
import { MonthYearField } from "./MonthYearField";

const INTRO_MESSAGE = {
  role: "assistant",
  content: "Tôi sẵn sàng phân tích doanh thu, công nợ, chi phí và vận hành phòng cho kỳ bạn chọn.",
};

const DEFAULT_QUESTIONS = [
  "Tháng này công nợ phòng nào cần xử lý?",
  "Tóm tắt doanh thu và chi phí kỳ này",
  "Phòng trống đang ảnh hưởng doanh thu thế nào?",
];

const BOOT_TIMEOUT_MS = 2500;
const DEFAULT_PANEL_WIDTH = 420;
const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 720;

async function bootFetch(fetcher, fallback) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), BOOT_TIMEOUT_MS);
  try {
    return await fetcher(controller.signal);
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timer);
  }
}

function sessionStorageKey(ownerId, period) {
  if (!ownerId) return "";
  return `advisor:session:${ownerId}:${period || "current"}`;
}

function messagesStorageKey(ownerId, period) {
  if (!ownerId) return "";
  return `advisor:messages:${ownerId}:${period || "current"}`;
}

function readCachedSession(ownerId, period) {
  if (typeof window === "undefined") return "";
  const key = sessionStorageKey(ownerId, period);
  return key ? window.localStorage.getItem(key) || "" : "";
}

function saveCachedSession(ownerId, period, nextSessionId) {
  const key = sessionStorageKey(ownerId, period);
  if (typeof window === "undefined" || !key || !nextSessionId) return;
  window.localStorage.setItem(key, nextSessionId);
}

function clearCachedSession(ownerId, period) {
  if (typeof window === "undefined") return;
  const sessionKey = sessionStorageKey(ownerId, period);
  const messageKey = messagesStorageKey(ownerId, period);
  if (sessionKey) window.localStorage.removeItem(sessionKey);
  if (messageKey) window.localStorage.removeItem(messageKey);
}

function readCachedMessages(ownerId, period) {
  if (typeof window === "undefined") return [];
  const key = messagesStorageKey(ownerId, period);
  if (!key) return [];
  try {
    return historyMessages(JSON.parse(window.localStorage.getItem(key) || "[]"));
  } catch {
    return [];
  }
}

function saveCachedMessages(ownerId, period, nextMessages) {
  const key = messagesStorageKey(ownerId, period);
  if (typeof window === "undefined" || !key) return;
  window.localStorage.setItem(key, JSON.stringify(historyMessages(nextMessages)));
}

function suggestionTexts(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => (typeof item === "string" ? item : item?.question || item?.title))
    .filter(Boolean)
    .slice(0, 3);
}

export function AdvisorChatWidget() {
  const { user } = useAuth();
  const ownerId = user?.id ?? user?.userId ?? user?.user_id ?? "";
  const [isOpen, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [period, setPeriod] = useState(() => currentAdvisorPeriod());
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isBooting, setBooting] = useState(false);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);
  const questionRef = useRef(null);
  const conversationStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !ownerId) return;

    let ignore = false;

    async function bootChat() {
      setBooting(true);
      setError("");

      try {
        const analysisPromise = bootFetch(
          (signal) => fetchAdvisorAnalysis(period, { signal }),
          { analyses: [] },
        );
        const cachedSessionId = readCachedSession(ownerId, period);
        let restoredMessages = readCachedMessages(ownerId, period);
        let activeSessionId = cachedSessionId;

        if (!conversationStartedRef.current) {
          if (cachedSessionId) setSessionId(cachedSessionId);
          setMessages(restoredMessages.length ? restoredMessages : [INTRO_MESSAGE]);
        }

        if (cachedSessionId) {
          const history = await bootFetch(
            (signal) => fetchAdvisorSessionHistory(cachedSessionId, { signal }),
            null,
          );
          if (history) {
            restoredMessages = mergeAdvisorMessages(restoredMessages, history?.history);
          } else {
            activeSessionId = "";
            restoredMessages = [];
            clearCachedSession(ownerId, period);
          }
        }

        if (!activeSessionId) {
          try {
            const createdSession = await createAdvisorSession();
            activeSessionId = resolveAdvisorSessionId(createdSession);
          } catch {
            // The ask endpoint can create a session when it receives an empty id.
          }
        }

        const analysis = await analysisPromise;
        if (ignore) return;

        if (!conversationStartedRef.current) {
          setSessionId(activeSessionId);
          saveCachedSession(ownerId, period, activeSessionId);
          if (restoredMessages.length) saveCachedMessages(ownerId, period, restoredMessages);
          setMessages(restoredMessages.length ? restoredMessages : [INTRO_MESSAGE]);
        }
        setSuggestions(suggestionTexts(analysis?.analyses));
      } catch (bootError) {
        if (!ignore) setError(bootError?.message || "Không mở được phiên chat AI.");
      } finally {
        if (!ignore) setBooting(false);
      }
    }

    bootChat();

    return () => {
      ignore = true;
    };
  }, [isOpen, ownerId, period]);

  useEffect(() => {
    if (!isOpen || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (!questionRef.current) return;
    const field = questionRef.current;
    field.style.height = "auto";
    const nextHeight = Math.min(Math.max(field.scrollHeight, 44), 144);
    field.style.height = `${nextHeight}px`;
    field.style.overflowY = field.scrollHeight > 144 ? "auto" : "hidden";
  }, [question, isOpen]);

  const quickQuestions = useMemo(
    () => (suggestions.length ? suggestions : DEFAULT_QUESTIONS),
    [suggestions],
  );

  function clampPanelWidth(value) {
    if (typeof window === "undefined") return value;
    return Math.min(Math.max(value, MIN_PANEL_WIDTH), Math.min(MAX_PANEL_WIDTH, window.innerWidth - 24));
  }

  function startResize(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;

    function resize(moveEvent) {
      setPanelWidth(clampPanelWidth(startWidth + startX - moveEvent.clientX));
    }

    function stopResize() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  function resizeWithKeyboard(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setPanelWidth((width) => clampPanelWidth(width + (event.key === "ArrowLeft" ? 24 : -24)));
  }

  async function submit(text = question) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setQuestion("");
    setSending(true);
    setError("");
    conversationStartedRef.current = true;
    const userMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(userMessages);
    saveCachedMessages(ownerId, period, userMessages);

    try {
      let activeSessionId = sessionId;
      let reply;

      try {
        reply = await askAdvisor({ question: trimmed, sessionId: activeSessionId, period });
      } catch (firstError) {
        clearCachedSession(ownerId, period);
        setSessionId("");

        try {
          const createdSession = await createAdvisorSession();
          activeSessionId = resolveAdvisorSessionId(createdSession);
        } catch {
          activeSessionId = "";
        }

        // Retry once with a fresh id; an empty id is also supported by the advisor service.
        try {
          reply = await askAdvisor({ question: trimmed, sessionId: activeSessionId, period });
        } catch {
          throw firstError;
        }
      }

      const nextSessionId = resolveAdvisorSessionId(reply, activeSessionId);
      const nextSuggestions = suggestionTexts(reply?.suggestions);

      if (nextSessionId && nextSessionId !== sessionId) setSessionId(nextSessionId);
      saveCachedSession(ownerId, period, nextSessionId);
      if (nextSuggestions.length) setSuggestions(nextSuggestions);

      const nextMessages = [
        ...userMessages,
        { role: "assistant", content: reply?.reply || "Tôi chưa có phản hồi phù hợp cho câu hỏi này." },
      ];
      setMessages(nextMessages);
      saveCachedMessages(ownerId, period, nextMessages);
    } catch (sendError) {
      const nextMessages = [
        ...userMessages,
        { role: "assistant", content: "Tôi chưa kết nối được dịch vụ AI. Vui lòng thử lại sau." },
      ];
      setError(sendError?.message || "Không gửi được câu hỏi.");
      setMessages(nextMessages);
      saveCachedMessages(ownerId, period, nextMessages);
    } finally {
      setSending(false);
    }
  }

  function handleQuestionKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  }

  return (
    <>
      {isOpen ? (
        <aside
          className="fixed bottom-0 right-0 top-0 z-50 flex max-w-[calc(100vw-24px)] flex-col overflow-hidden border-l border-[#d7deea] bg-white shadow-2xl dark:border-white/10 dark:bg-[#020817]"
          style={{ width: `${clampPanelWidth(panelWidth)}px` }}
          aria-label="Khung chat AI cố vấn tài chính"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Kéo để đổi độ rộng khung chat"
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={MAX_PANEL_WIDTH}
            aria-valuenow={panelWidth}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={resizeWithKeyboard}
            className="absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize touch-none items-center justify-center bg-transparent transition hover:bg-[#3156b6]/10 dark:hover:bg-white/10 sm:flex"
          >
            <span className="h-12 w-1 rounded-full bg-[#cbd5e1] dark:bg-slate-600" />
          </div>
          <header className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#0f1d33] px-4 py-3 text-white dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/12">
                <BotMessageSquare className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black">AI cố vấn tài chính</h2>
                <p className="truncate text-[11px] font-semibold text-white/65">Chatbot phân tích vận hành</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"
              aria-label="Đóng chat AI"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 dark:border-white/10 dark:bg-[#0f172a]">
            <CalendarDays className="h-4 w-4 text-[#64748b] dark:text-slate-400" />
            <MonthYearField
              value={period}
              onChange={(nextPeriod) => {
                setPeriod(nextPeriod);
                setSessionId("");
                setMessages([INTRO_MESSAGE]);
                setSuggestions([]);
                setError("");
                conversationStartedRef.current = false;
              }}
              label="Kỳ"
              className="h-9"
            />
            {isBooting ? <Loader2 className="h-4 w-4 animate-spin text-[#64748b] dark:text-slate-400" /> : null}
          </div>

          {error ? (
            <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <div ref={bodyRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4 dark:bg-[#020817]">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-[#1f3f8f] text-white dark:bg-[#3156b6]"
                      : "border border-[#dce2ec] bg-[#f8fafc] text-[#0f1d33] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
                  }`}
                >
                  <MarkdownContent content={message.content} inverted={message.role === "user"} />
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#dce2ec] bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#64748b] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI đang phân tích...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 dark:border-white/10 dark:bg-[#0f172a]">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submit(item)}
                  disabled={isSending}
                  className="max-w-[min(20rem,78vw)] shrink-0 whitespace-normal rounded-lg border border-[#d7deea] bg-white px-3 py-2 text-left text-[11px] font-bold leading-4 text-[#334155] hover:bg-[#eef3ff] disabled:opacity-50 dark:border-white/10 dark:bg-[#111c2e] dark:text-slate-200 dark:hover:bg-[#1f2a44]"
                >
                  {item}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <textarea
                ref={questionRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="Hỏi về doanh thu, công nợ, phòng trống..."
                rows={1}
                className="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-[#cbd5e1] bg-white px-3 py-3 text-sm font-semibold leading-5 text-[#0f1d33] outline-none placeholder:text-slate-400 focus:border-[#3156b6] disabled:opacity-60 dark:border-white/10 dark:bg-[#020817] dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={isSending || !question.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#1f3f8f] text-white hover:bg-[#18347c] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi câu hỏi"
                title="Gửi"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </aside>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#1f3f8f] text-white shadow-xl transition hover:bg-[#18347c]"
          aria-label="Mở chat AI cố vấn tài chính"
          title="AI cố vấn tài chính"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f8b91f] text-[#0f1d33]">
            <Sparkles className="h-3 w-3" />
          </span>
        </button>
      ) : null}
    </>
  );
}
