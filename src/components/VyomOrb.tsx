import { motion } from 'motion/react';

interface VyomOrbProps {
  isListening: boolean;
  isProcessing: boolean;
}

export function VyomOrb({ isListening, isProcessing }: VyomOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{
          scale: isListening ? [1, 1.2, 1] : 1,
          opacity: isListening ? [0.5, 0.8, 0.5] : 0.3,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Middle ring */}
      <motion.div
        className="absolute inset-4 rounded-full border border-cyan-400/30"
        animate={{
          rotate: isProcessing ? 360 : 0,
          scale: isListening ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
      />

      {/* Inner core */}
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_40px_rgba(34,211,238,0.5)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: isListening ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30 mix-blend-overlay"></div>
        <motion.div 
          className="w-16 h-16 rounded-full bg-white/20 blur-md"
          animate={{
            scale: isProcessing ? [1, 1.5, 1] : 1,
            opacity: isProcessing ? [0.5, 1, 0.5] : 0.5,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
