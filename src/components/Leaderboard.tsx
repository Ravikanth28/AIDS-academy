'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, Star, Medal, Zap, Gift, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

interface LeaderEntry {
  rank: number
  userId: string
  name: string
  points: number
  isMe?: boolean
}

interface LeaderboardData {
  month: number
  year: number
  leaderboard: LeaderEntry[]
  myRank?: number | null
  myPoints?: number
  totalParticipants?: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const RANK_STYLES = [
  { bg: 'from-yellow-500/25 to-amber-600/10', border: 'border-yellow-500/40', icon: Crown, iconColor: 'text-yellow-400', shadow: 'shadow-yellow-500/20', badge: '🥇' },
  { bg: 'from-slate-400/20 to-slate-600/10',  border: 'border-slate-400/30',  icon: Medal, iconColor: 'text-slate-300',  shadow: 'shadow-slate-400/10', badge: '🥈' },
  { bg: 'from-orange-600/20 to-orange-800/10', border: 'border-orange-500/30', icon: Medal, iconColor: 'text-orange-400', shadow: 'shadow-orange-500/15', badge: '🥉' },
]

function PodiumCard({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const style = RANK_STYLES[rank - 1]
  const heights = ['h-36', 'h-28', 'h-24']
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.12, type: 'spring', stiffness: 200 }}
      className={`flex flex-col items-center ${rank === 1 ? 'z-10' : 'z-0'}`}
    >
      {/* Crown / medal */}
      <motion.div
        animate={rank === 1 ? { y: [0, -6, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-2xl mb-1"
      >
        {style.badge}
      </motion.div>
      {/* Avatar */}
      <motion.div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
          rank === 1 ? 'from-yellow-400 to-amber-600' :
          rank === 2 ? 'from-slate-300 to-slate-500' :
          'from-orange-400 to-orange-600'
        } flex items-center justify-center text-xl font-bold shadow-lg ${style.shadow} mb-2`}
        whileHover={{ scale: 1.08 }}
      >
        {entry.name[0].toUpperCase()}
      </motion.div>
      <div className="text-xs font-semibold text-white/80 text-center max-w-[80px] truncate">{entry.name}</div>
      <div className={`text-[11px] font-bold mt-0.5 ${
        rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : 'text-orange-400'
      }`}>{entry.points} pts</div>
      {/* Podium block */}
      <div className={`w-full mt-2 rounded-t-xl bg-gradient-to-b ${style.bg} border ${style.border} ${heights[rank - 1]} flex items-end justify-center pb-2 shadow-lg ${style.shadow}`}>
        <span className="text-white/30 text-xs font-bold">#{rank}</span>
      </div>
    </motion.div>
  )
}

export default function Leaderboard({ apiUrl, showMyRank = true }: { apiUrl: string; showMyRank?: boolean }) {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthOffset, setMonthOffset] = useState(0)

  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const month = targetDate.getMonth() + 1
  const year = targetDate.getFullYear()

  useEffect(() => {
    setLoading(true)
    fetch(`${apiUrl}?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => {
        if (d?.leaderboard) {
          d.leaderboard = d.leaderboard.map((e: LeaderEntry & { user?: { name: string } }) => ({
            ...e,
            name: e.name || e.user?.name || 'Unknown',
          }))
        }
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [month, year, apiUrl])

  const isCurrentMonth = monthOffset === 0
  const top3 = data?.leaderboard.slice(0, 3) ?? []
  const rest = data?.leaderboard.slice(3) ?? []

  const daysLeft = (() => {
    const end = new Date(year, month, 0)
    const diff = end.getTime() - new Date().getTime()
    return isCurrentMonth ? Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))) : 0
  })()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trophy className="w-6 h-6 text-amber-400" />
          </motion.div>
          <div>
            <h2 className="font-display font-bold text-lg">Monthly Leaderboard</h2>
            <p className="text-xs text-white/40">
              {MONTH_NAMES[month - 1]} {year}
              {isCurrentMonth && daysLeft > 0 && <span className="text-amber-400/70"> · {daysLeft}d left</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button disabled={monthOffset === 0} onClick={() => setMonthOffset(o => o + 1)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prize banner */}
      {isCurrentMonth && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-900/20 via-yellow-900/10 to-orange-900/15 p-4"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-3xl"
            >
              🎁
            </motion.div>
            <div>
              <p className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Monthly Prize
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                #1 at month end wins a <span className="text-amber-300 font-medium">surprise gift</span>! Board resets on the 1st.
              </p>
            </div>
            {isCurrentMonth && daysLeft <= 7 && daysLeft > 0 && (
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="ml-auto text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full border border-red-500/30 flex-shrink-0"
              >
                ⚡ {daysLeft}d left!
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No scores yet for {MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-xs mt-1 text-white/20">Complete modules to earn points</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length >= 2 && (
            <div className="flex items-end justify-center gap-3 px-4 pt-4">
              {top3.length >= 2 && <PodiumCard entry={top3[1]} rank={2} />}
              {top3[0] && <PodiumCard entry={top3[0]} rank={1} />}
              {top3[2] && <PodiumCard entry={top3[2]} rank={3} />}
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((entry, i) => (
                <motion.div key={entry.userId}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    entry.isMe
                      ? 'border border-cyan-500/30 bg-cyan-500/8'
                      : 'hover:bg-white/3'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 flex-shrink-0">
                    {entry.rank}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {entry.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {entry.name} {entry.isMe && <span className="text-cyan-400 text-xs">(you)</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {entry.points}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* My rank footer */}
          {showMyRank && data.myRank !== null && data.myRank !== undefined && data.myRank > 3 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="border-t border-white/8 pt-3 mt-3"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/8">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                  {data.myRank}
                </div>
                <div className="flex-1 text-sm text-cyan-300 font-medium">You</div>
                <div className="text-sm font-bold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {data.myPoints}
                </div>
              </div>
              <p className="text-xs text-white/30 text-center mt-2">
                {data.totalParticipants} participants this month
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
