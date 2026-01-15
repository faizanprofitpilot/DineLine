"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, ShoppingCart, Calendar, Bot, BookOpen, Settings, CreditCard } from "lucide-react"

const navItems = [
  { title: "Overview", url: "/dashboard", icon: Home },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Reservations", url: "/reservations", icon: Calendar },
  { title: "AI", url: "/ai-receptionist", icon: Bot },
  { title: "Knowledge", url: "/knowledge-base", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
]

export function TabNav() {
  const pathname = usePathname()

      return (
        <nav className="border-b bg-white/50" style={{ borderColor: '#DEB887' }}>
          <div className="flex items-center justify-center gap-1 px-6 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.url || 
            (item.url !== '/dashboard' && item.url !== '/settings' && item.url !== '/billing' && pathname.startsWith(item.url))
          
          const Icon = item.icon
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                "hover:bg-[#FFF0C2]",
                isActive
                  ? "text-[#654321] font-semibold"
                  : "text-[#A0522D] hover:text-[#654321]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8C42] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

