"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/clients/supabase"
import { Search, User, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TopBarProps {
  restaurantName?: string | null
}

export function TopBar({ restaurantName }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const supabase = React.useMemo(() => {
    if (typeof window === 'undefined') return null
    return createBrowserClient()
  }, [])

  // Fetch user email on mount
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    fetchUser()
  }, [supabase])

  // Sync search query with URL when on orders page
  React.useEffect(() => {
    if (pathname === '/orders' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const searchParam = params.get('search')
      if (searchParam) {
        setSearchQuery(searchParam)
      } else {
        setSearchQuery('')
      }
    } else if (pathname !== '/orders') {
      setSearchQuery('')
    }
  }, [pathname])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/orders?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/orders')
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchQuery.trim()) {
        router.push(`/orders?search=${encodeURIComponent(searchQuery.trim())}`)
      } else {
        router.push('/orders')
      }
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderColor: '#DEB887' }}>
      <div className="flex h-16 items-center px-6 gap-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <img
              src="/full-logo.png"
              alt="DineLine"
              className="h-16 w-auto"
            />
          </Link>
        </div>

        {/* Center: Global Search */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#A0522D', opacity: 0.6 }} />
            <input
              type="text"
              placeholder="Search orders, customers, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 pl-10 pr-4 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFDF7',
                color: '#654321',
                '--tw-ring-color': '#FF8C42',
              } as React.CSSProperties}
            />
          </form>
        </div>

        {/* Right: Restaurant Name + User Menu */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {restaurantName && (
            <div className="flex items-center">
              <span className="text-base font-semibold" style={{ color: '#654321' }}>
                {restaurantName}
              </span>
            </div>
          )}
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  style={{ color: '#654321' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF8C42] to-[#8B4513] flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", userMenuOpen && "rotate-180")} style={{ color: '#A0522D', opacity: 0.6 }} />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-lg bg-white z-50 py-2"
                  style={{ borderColor: '#DEB887' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#DEB887' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#A0522D', opacity: 0.7 }}>
                      Account
                    </p>
                    <p className="text-sm font-medium break-all" style={{ color: '#654321' }}>
                      {userEmail || 'Loading...'}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer"
                    style={{ color: '#654321' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

