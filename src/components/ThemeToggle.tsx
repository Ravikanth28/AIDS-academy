'use client'

import { Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggle}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
        border hover:scale-105 active:scale-95
        ${isLight
          ? 'bg-amber-50 border-amber-200 shadow-sm shadow-amber-100'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30'
        }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLight ? (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Moon className="w-4 h-4 text-indigo-600" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Sun className="w-4 h-4 text-amber-300" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
