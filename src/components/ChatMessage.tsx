"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, Copy, FileText, RotateCcw, Sparkles } from "lucide-react";
import { Message } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Gear5Loader } from "./Gear5Loader";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

export function ChatMessage({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[92%] gap-3 sm:max-w-[82%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        {!isUser && (
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-white via-amber-100 to-amber-300 text-black shadow-[0_0_16px_rgba(255,255,255,0.45)]">
            <Sparkles className="h-4 w-4 text-red-600" />
          </div>
        )}

        {/* Message Bubble */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div
            className={`rounded-2xl px-4 py-3 shadow-lg backdrop-blur-xl ${
              isUser
                ? "rounded-tr-sm border border-red-400/35 bg-gradient-to-br from-red-600/45 via-red-900/45 to-black/65 text-white shadow-[0_4px_24px_rgba(220,38,38,0.2)]"
                : message.isError
                ? "rounded-tl-sm border border-red-500/45 bg-red-950/70 text-red-100"
                : "rounded-tl-sm border border-white/20 bg-black/55 text-white shadow-[0_4px_24px_rgba(255,255,255,0.06)]"
            }`}
          >
            {/* Optional attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {message.attachments.map((att, idx) => (
                  <span
                    key={`${att.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-2.5 py-1 text-xs text-amber-200"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[160px] truncate">{att.name}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed sm:text-[15px]">
                {message.content}
              </p>
            ) : message.isError ? (
              <div className="flex items-start gap-2.5 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="leading-relaxed">{message.content}</p>
              </div>
            ) : message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <Gear5Loader />
            )}

            {/* Streaming pulse indicator at bottom of partial response */}
            {!isUser && isStreaming && message.content && (
              <div className="mt-2">
                <Gear5Loader />
              </div>
            )}
          </div>

          {/* Action bar for assistant messages */}
          {!isUser && !isStreaming && message.content && (
            <div className="flex items-center gap-1.5 px-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-amber-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {isLastAssistant && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
                  aria-label="Regenerate response"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
