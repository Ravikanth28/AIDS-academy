'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number
  perPage: number
  onChange: (p: number) => void
}

export function Pagination({ page, total, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  let pageButtons: (number | 'left-dots' | 'right-dots')[]
  if (totalPages <= 7) {
    pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
  } else if (page <= 4) {
    pageButtons = [1, 2, 3, 4, 5, 'right-dots', totalPages]
  } else if (page >= totalPages - 3) {
    pageButtons = [1, 'left-dots', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  } else {
    pageButtons = [1, 'left-dots', page - 1, page, page + 1, 'right-dots', totalPages]
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-white/5">
      <p className="text-xs text-white/30 order-2 sm:order-1">
        Showing <span className="text-white/60 font-medium">{from}–{to}</span> of{' '}
        <span className="text-white/60 font-medium">{total}</span> results
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First page */}
        <button
          disabled={page === 1}
          onClick={() => onChange(1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev */}
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5">
          {pageButtons.map((p, i) =>
            p === 'left-dots' || p === 'right-dots' ? (
              <span
                key={`${p}-${i}`}
                className="w-8 h-8 flex items-center justify-center text-white/25 text-xs"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  p === page
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-800/40 scale-105'
                    : 'bg-white/5 border border-white/8 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(totalPages)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
