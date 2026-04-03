'use client'

import Leaderboard from '@/components/Leaderboard'
import { Trophy, Info } from 'lucide-react'

export default function AdminLeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" />
          <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-white/40 mt-1">Top students ranked by monthly points — resets every 1st of the month</p>
      </div>

      {/* Points guide */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-sm text-white/70 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" /> Points System
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { emoji: '🔑', label: 'Login',        pts: 5   },
            { emoji: '📚', label: 'Enroll Course', pts: 10  },
            { emoji: '🎬', label: 'Video Watched', pts: 10  },
            { emoji: '⚡', label: 'Test Passed',   pts: 25  },
            { emoji: '🏆', label: 'Certificate',   pts: 100 },
          ].map(p => (
            <div key={p.label} className="text-center p-3 rounded-xl bg-white/3 border border-white/5">
              <div className="text-xl mb-1">{p.emoji}</div>
              <div className="text-xs text-white/50">{p.label}</div>
              <div className="font-bold text-amber-400 text-sm">+{p.pts} pts</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <Leaderboard apiUrl="/api/admin/leaderboard" showMyRank={false} />
      </div>
    </div>
  )
}
