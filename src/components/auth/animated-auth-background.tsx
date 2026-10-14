import { motion } from "framer-motion";

export function AnimatedAuthBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Base Ambient Fallback Gradient */}
      <div className="absolute inset-0 bg-[#F5F6FC] dark:bg-[#070A12]" />

      {/* 2. Primary Animated Background Image with Ken Burns breathing pan */}
      <motion.div
        initial={{ scale: 1, x: 0, y: 0 }}
        animate={{
          scale: [1, 1.05, 1.02, 1],
          x: ["0%", "-1.2%", "0.8%", "0%"],
          y: ["0%", "-0.8%", "-0.4%", "0%"],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-4 sm:-inset-6"
      >
        <img
          src="/auth-bg.png"
          alt="Quesole Smart Lobby"
          className="w-full h-full object-cover object-center filter saturate-[1.08] contrast-[1.03] dark:brightness-[0.78] dark:contrast-[1.15]"
          loading="eager"
        />
      </motion.div>

      {/* 3. Sweeping Prismatic Light Wave / Shimmer Beam across curves */}
      <div className="absolute inset-0 overflow-hidden opacity-45 dark:opacity-25 mix-blend-overlay">
        <motion.div
          initial={{ x: "-150%" }}
          animate={{ x: ["-150%", "250%"] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 3,
          }}
          className="absolute inset-y-0 w-1/2 -skew-x-25 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
        />
      </div>

      {/* 4. Strategic Smart Queue Luminous Beacon Nodes (Synced to Artwork Elements) */}
      
      {/* Beacon 1: Left Smart Kiosk Circular Floor Wave */}
      <div className="absolute left-[5%] sm:left-[8%] bottom-[24%] sm:bottom-[28%] pointer-events-none">
        {/* Expanding Wave 1 */}
        <motion.div
          animate={{ scale: [0.8, 2.4], opacity: [0.75, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut" }}
          className="absolute -inset-8 rounded-full border border-cyan-400/80 bg-cyan-400/10"
        />
        {/* Expanding Wave 2 (delayed) */}
        <motion.div
          animate={{ scale: [0.8, 2.4], opacity: [0.75, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut", delay: 1.8 }}
          className="absolute -inset-8 rounded-full border border-indigo-400/80 bg-indigo-500/10"
        />
        {/* Core Glowing Dot */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_18px_6px_rgba(56,189,248,0.85)]"
        />
      </div>

      {/* Beacon 2: Curved Data-Stream Orbital Node (Left-Center) */}
      <div className="absolute left-[20%] sm:left-[24%] bottom-[34%] sm:bottom-[38%] pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_14px_4px_rgba(99,102,241,0.9)]"
        />
        <motion.div
          animate={{ scale: [0.9, 2], opacity: [0.5, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          className="absolute -inset-2 rounded-full border border-indigo-400"
        />
      </div>

      {/* Beacon 3: Right Reception Counter Service Node */}
      <div className="absolute right-[18%] sm:right-[22%] bottom-[30%] sm:bottom-[34%] pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="h-3.5 w-3.5 rounded-full bg-purple-500 shadow-[0_0_16px_5px_rgba(168,85,247,0.85)]"
        />
        <motion.div
          animate={{ scale: [0.9, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", delay: 1 }}
          className="absolute -inset-2 rounded-full border border-purple-400"
        />
      </div>

      {/* Beacon 4: Bottom Right Orbital Ring */}
      <div className="absolute right-[8%] sm:right-[10%] bottom-[12%] sm:bottom-[15%] pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_14px_4px_rgba(56,189,248,0.8)]"
        />
      </div>

      {/* 5. Floating Ambient Light Photons / Micro-Sparks */}
      <motion.div
        animate={{ y: [-10, -35, -10], x: [0, 10, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[15%] top-[25%] h-2 w-2 rounded-full bg-cyan-300 blur-[1px] shadow-[0_0_10px_#38bdf8]"
      />
      <motion.div
        animate={{ y: [-15, -45, -15], x: [0, -12, 0], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute right-[28%] top-[20%] h-2.5 w-2.5 rounded-full bg-purple-400 blur-[1px] shadow-[0_0_12px_#c084fc]"
      />
      <motion.div
        animate={{ y: [-8, -25, -8], x: [0, 8, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
        className="absolute left-[40%] bottom-[20%] h-2 w-2 rounded-full bg-indigo-300 blur-[1px] shadow-[0_0_8px_#818cf8]"
      />

      {/* 6. Soft Ambient Aurora Blooms for Rich Color Depth */}
      <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[0%] left-[0%] w-[500px] h-[400px] rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-500/10 to-transparent blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[0%] right-[0%] w-[550px] h-[450px] rounded-full bg-gradient-to-tl from-purple-500/20 via-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />

      {/* 7. Readability Lens: Central Soft Glass Gradient Wash */}
      {/* In light mode: smooth translucent veil in the center ensures maximum form contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_40%,rgba(255,255,255,0.72)_0%,rgba(248,250,255,0.45)_55%,rgba(240,244,255,0.1)_100%)] pointer-events-none" />

      {/* In dark mode: cyber-lounge midnight scrim letting glowing nodes and screens shine */}
      <div className="absolute inset-0 dark:bg-slate-950/70 dark:backdrop-brightness-75 dark:bg-[radial-gradient(ellipse_75%_65%_at_50%_40%,rgba(8,12,22,0.82)_0%,rgba(6,9,18,0.55)_60%,transparent_100%)] pointer-events-none" />
    </div>
  );
}
