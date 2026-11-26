"use client";

import { motion } from "framer-motion";

export function Gear5Loader() {
  return (
    <div className="flex items-center gap-3 py-1" role="status" aria-label="Generating response">
      <div className="relative flex h-6 w-6 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-amber-400/70"
          animate={{ scale: [0.8, 1.45, 0.8], opacity: [0.9, 0.15, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-0.5 rounded-full border border-white/80"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
          animate={{ scale: [0.85, 1.2, 0.85] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span className="text-xs font-medium tracking-wide text-white/80">
        Drums of Liberation...
      </span>
    </div>
  );
}
