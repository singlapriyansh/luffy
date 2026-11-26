"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Eraser,
  Menu,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Attachment, Conversation, Message } from "@/types/chat";
import { YouTubeBackground } from "./YouTubeBackground";
import { Sidebar } from "./Sidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

const STORAGE_KEY = "gear5_ai_conversations_v1";

const STARTER_PROMPTS = [
  "Explain how Gear 5's power of imagination works",
  "Build a clean TypeScript debounce hook with React",
  "Give me a 30-day workout & focus plan",
  "Brainstorm 5 bold startup ideas using AI",
];

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New Adventure";
  return clean.length > 38 ? `${clean.slice(0, 38)}…` : clean;
}

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [videoStatus, setVideoStatus] = useState({
    isReady: false,
    hasEnded: false,
    hasError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydrate conversations from localStorage and set initial sidebar state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
        }
      }
    } catch {
      // Ignore corrupt localStorage
    }

    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
    setHasHydrated(true);
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore quota errors
    }
  }, [conversations, hasHydrated]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, isStreaming]);

  const handleVideoStateChange = useCallback(
    (state: { isReady: boolean; hasEnded: boolean; hasError: boolean }) => {
      setVideoStatus(state);
    },
    []
  );

  const handleNewChat = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveId(null);
  };

  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setConversations([]);
    setActiveId(null);
  };

  const handleClearCurrentConversation = () => {
    if (!activeId) return;
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [], updatedAt: Date.now() } : c
      )
    );
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const streamAssistantResponse = async (
    conversationId: string,
    historyForApi: { role: "user" | "assistant"; content: string }[],
    assistantMessageId: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    const updateAssistantMessage = (content: string, isError = false) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                updatedAt: Date.now(),
                messages: conv.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content, isError } : m
                ),
              }
            : conv
        )
      );
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `Request failed (${response.status}).`;
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData?.error) errorMessage = errData.error;
        } catch {
          // Keep default errorMessage
        }
        updateAssistantMessage(errorMessage, true);
        return;
      }

      if (!response.body) {
        updateAssistantMessage("No response stream received from server.", true);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) {
              updateAssistantMessage(parsed.error, true);
              return;
            }
            if (parsed.content) {
              accumulated += parsed.content;
              updateAssistantMessage(accumulated, false);
            }
          } catch {
            // Ignore malformed SSE line
          }
        }
      }

      if (!accumulated.trim()) {
        updateAssistantMessage("No response was generated. Please try again.", true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped generation; keep whatever was streamed so far
        return;
      }
      updateAssistantMessage(
        "Network error while contacting the AI backend. Please check your connection and try again.",
        true
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (rawText: string, attachments: Attachment[] = []) => {
    if (isStreaming) return;

    // Build full user prompt including any attached text/code files
    let fullContent = rawText.trim();
    if (attachments.length > 0) {
      const attachmentText = attachments
        .map((a) => `\n\n--- Attached File: ${a.name} ---\n\`\`\`\n${a.content}\n\`\`\``)
        .join("");
      fullContent = fullContent
        ? `${fullContent}${attachmentText}`
        : `Please analyze the attached file(s):${attachmentText}`;
    }

    if (!fullContent) return;

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content: rawText.trim() || "Attached file(s)",
      createdAt: Date.now(),
      attachments: attachments.map((a) => ({ name: a.name, size: a.size })),
    };

    const assistantMsg: Message = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    let targetConvId = activeId;
    let historyForApi: { role: "user" | "assistant"; content: string }[] = [];

    if (!targetConvId) {
      targetConvId = createId();
      const newConv: Conversation = {
        id: targetConvId,
        title: deriveTitle(userMsg.content),
        messages: [userMsg, assistantMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(targetConvId);
      historyForApi = [{ role: "user", content: fullContent }];
    } else {
      const existing = conversations.find((c) => c.id === targetConvId);
      const validPrior = (existing?.messages ?? [])
        .filter((m) => !m.isError && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      historyForApi = [...validPrior, { role: "user", content: fullContent }];

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const nextTitle =
            c.messages.length === 0 ? deriveTitle(userMsg.content) : c.title;
          return {
            ...c,
            title: nextTitle,
            messages: [...c.messages, userMsg, assistantMsg],
            updatedAt: Date.now(),
          };
        })
      );
    }

    await streamAssistantResponse(targetConvId, historyForApi, assistantMsg.id);
  };

  const handleRegenerate = async () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Remove the trailing assistant message and regenerate from preceding context
    const lastMsg = msgs[msgs.length - 1];
    const baseMessages = lastMsg.role === "assistant" ? msgs.slice(0, -1) : msgs;

    const historyForApi = baseMessages
      .filter((m) => !m.isError && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    if (historyForApi.length === 0 || historyForApi[historyForApi.length - 1].role !== "user") {
      return;
    }

    const newAssistantMsg: Message = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: [...baseMessages, newAssistantMsg],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    await streamAssistantResponse(activeConversation.id, historyForApi, newAssistantMsg.id);
  };

  const messages = activeConversation?.messages ?? [];

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-[#07070b] text-white">
      {/* Full-Screen One-Time YouTube Background */}
      <YouTubeBackground
        isMuted={isMuted}
        onVideoStateChange={handleVideoStateChange}
      />

      {/* Foreground App Shell */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          isOpen={isSidebarOpen}
          onClose={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setIsSidebarOpen(false);
            }
          }}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
          onClearAll={handleClearAll}
        />

        {/* Main Chat Area */}
        <div className="flex h-full min-w-0 flex-1 flex-col">
          {/* Top Glass Header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-black/35 px-3 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-[0_0_16px_rgba(255,255,255,0.12)]">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Luffy AI · Gear 5</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCurrentConversation}
                  title="Clear current conversation"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/75 transition hover:border-red-400/40 hover:bg-red-500/15 hover:text-white"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              {!videoStatus.hasError && !videoStatus.hasEnded && (
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  title={isMuted ? "Unmute background video" : "Mute background video"}
                  aria-label={isMuted ? "Unmute background video" : "Mute background video"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:border-amber-400/40 hover:bg-white/15 hover:text-white"
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-white/65" />
                      <span className="hidden sm:inline">Sound Off</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-amber-300" />
                      <span className="hidden sm:inline">Sound On</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </header>

          {/* Messages Scroll Area */}
          <main className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full rounded-3xl border border-white/15 bg-black/45 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-white via-amber-100 to-red-500 text-black shadow-[0_0_32px_rgba(255,255,255,0.45)]">
                    <Sparkles className="h-7 w-7 text-red-600" />
                  </div>

                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    Awaken Your Ideas
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/70">
                    The Drums of Liberation are beating. Ask anything—from code and architecture to bold creative adventures.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <motion.button
                        key={prompt}
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleSend(prompt)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-xs font-medium text-white/85 transition hover:border-amber-400/45 hover:bg-white/10 hover:text-white sm:text-sm"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-4">
                {messages.map((msg, index) => {
                  const isLast = index === messages.length - 1;
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreaming && isLast && msg.role === "assistant"}
                      isLastAssistant={isLast && msg.role === "assistant"}
                      onRegenerate={handleRegenerate}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* Bottom Fixed Input */}
          <ChatInput onSend={handleSend} onStop={handleStop} isLoading={isStreaming} />
        </div>
      </div>
    </div>
  );
}
