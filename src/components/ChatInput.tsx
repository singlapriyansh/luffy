"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, FileText, Paperclip, Square, X } from "lucide-react";
import { Attachment } from "@/types/chat";

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 100 * 1024; // 100 KB
const ALLOWED_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".css",
  ".html",
  ".csv",
  ".yml",
  ".yaml",
];

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
    setFileError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!hasValidExt) {
        setFileError(
          `Unsupported file "${file.name}". Supported: ${ALLOWED_EXTENSIONS.join(", ")}`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" exceeds the 100 KB limit.`);
        continue;
      }

      try {
        const content = await file.text();
        newAttachments.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          content,
        });
      } catch {
        setFileError(`Failed to read "${file.name}".`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 3));
    }

    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isLoading;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
      {fileError && (
        <p className="mb-2 rounded-lg border border-red-500/35 bg-red-950/70 px-3 py-1.5 text-xs text-red-200 backdrop-blur-md">
          {fileError}
        </p>
      )}

      <div
        className={`relative rounded-2xl border bg-black/60 backdrop-blur-2xl transition-all duration-200 ${
          isFocused
            ? "border-amber-400/60 shadow-[0_0_28px_rgba(245,158,11,0.18)]"
            : "border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        }`}
      >
        {/* Attached files preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-3.5 pt-3 pb-2">
            {attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-amber-200"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="rounded-full p-0.5 text-white/60 transition hover:bg-white/15 hover:text-white"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-2.5 sm:p-3">
          {/* Functional Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach text or code file (max 100 KB)"
            aria-label="Attach text or code file"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/10 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          {/* Auto-expanding Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything, I'm listening..."
            className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder:text-white/45 focus:outline-none sm:text-[15px]"
          />

          {/* Send or Stop Button */}
          {isLoading ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/50 bg-red-600/80 text-white shadow-[0_0_16px_rgba(220,38,38,0.45)] transition hover:bg-red-500"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={canSend ? { scale: 1.06 } : undefined}
              whileTap={canSend ? { scale: 0.94 } : undefined}
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="Send message"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                canSend
                  ? "bg-gradient-to-br from-white via-amber-200 to-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,0.45)] hover:brightness-105"
                  : "cursor-not-allowed bg-white/10 text-white/30"
              }`}
            >
              <ArrowUp className="h-4.5 w-4.5 stroke-[2.5]" />
            </motion.button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-white/45">
        Enter to send · Shift + Enter for new line
      </p>
    </div>
  );
}
