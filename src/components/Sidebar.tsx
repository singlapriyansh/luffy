"use client";

import { Conversation } from "@/types/chat";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  isOpen,
  onClose,
  onSelect,
  onNewChat,
  onDelete,
  onClearAll,
}: SidebarProps) {
  const sidebarBody = (
    <div className="flex h-full w-72 flex-col border-r border-white/15 bg-black/65 backdrop-blur-2xl">
      {/* Brand + Close on mobile */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-white via-amber-200 to-red-500 text-xs font-black text-black shadow-[0_0_18px_rgba(255,255,255,0.4)]">
            G5
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Gear 5 AI</p>
            <p className="text-[11px] text-amber-300/80">Warrior of Liberation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,255,255,0.08)] transition hover:border-amber-400/50 hover:bg-white/15"
        >
          <Plus className="h-4 w-4 text-amber-300" />
          <span>New Chat</span>
        </motion.button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1">
        <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Conversations
        </p>

        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-white/45">
            No conversations yet. Start a new adventure!
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <li key={conv.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(conv.id);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 pr-9 text-left text-sm transition ${
                      isActive
                        ? "border border-amber-400/35 bg-gradient-to-r from-red-600/25 via-white/10 to-transparent text-white shadow-sm"
                        : "border border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-amber-300" : "text-white/45"
                      }`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300 focus:opacity-100"
                    aria-label={`Delete ${conv.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer / Clear All */}
      {conversations.length > 0 && (
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onClearAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All History</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop persistent / collapsible sidebar */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="hidden h-full shrink-0 overflow-hidden lg:block"
          >
            {sidebarBody}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile & Tablet Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-50 h-full"
            >
              {sidebarBody}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
