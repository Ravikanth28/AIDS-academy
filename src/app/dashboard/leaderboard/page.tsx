'use client'

import Leaderboard from '@/components/Leaderboard'
import { Trophy, Zap, Info } from 'lucide-react'
import { motion } from 'framer-motion'

export default function StudentLeaderboardPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" />
          <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-white/40 mt-1">Compete with fellow students — earn points & win monthly prizes!</p>
      </motion.div>

      {/* How to earn */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-5">
        <h2 className="font-semibold text-sm text-white/60 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Earn Points
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { emoji: '🔑', label: 'Login', pts: 5 },
            { emoji: '📚', label: 'Enroll', pts: 10 },
            { emoji: '⚡', label: 'Pass Test', pts: 25 },
            { emoji: '🏆', label: 'Certificate', pts: 100 },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
              <span className="text-sm">{p.emoji}</span>
              <span className="text-xs text-white/60">{p.label}</span>
              <span className="text-xs font-bold text-amber-400">+{p.pts}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card p-6">
        <Leaderboard apiUrl="/api/student/leaderboard" showMyRank={true} />
      </motion.div>
    </div>
  )
}
