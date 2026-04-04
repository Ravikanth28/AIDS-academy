'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Activity,
  Trophy,
  Award,
  KeyRound,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/students/credentials', label: 'Credentials', icon: KeyRound },
  { href: '/admin/certificates', label: 'Certificates', icon: Award },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.role !== 'ADMIN') router.push('/dashboard')
        else setUser(data)
      })
      .catch(() => router.push('/login'))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-dark-200 border-r border-white/5 z-30 
        transition-transform duration-300 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-sm gradient-text">AI·DS Academy</div>
              <div className="text-xs text-white/30">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="p-4 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/admin' &&
               item.href !== '/admin/students' &&
               pathname?.startsWith(item.href)) ||
              (item.href === '/admin/students' &&
               (pathname === '/admin/students' || (pathname?.startsWith('/admin/students/') && !pathname?.startsWith('/admin/students/credentials'))))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-white/5">
          {user && (
            <div className="glass-card p-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="badge-purple text-xs px-2 py-0.5 mt-0.5">Admin</div>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-200 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-sm gradient-text">AI·DS Admin</span>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-3 sm:p-6">
          <div className="w-full max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
