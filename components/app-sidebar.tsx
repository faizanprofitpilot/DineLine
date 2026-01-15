"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Home, Settings, Phone, Bot, BookOpen, CreditCard, Calendar, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/clients/supabase"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: Phone,
  },
  {
    title: "Reservations",
    url: "/reservations",
    icon: Calendar,
  },
  {
    title: "AI Receptionist",
    url: "/ai-receptionist",
    icon: Bot,
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = React.useMemo(() => {
    if (typeof window === 'undefined') return null
    return createBrowserClient()
  }, [])

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center justify-start px-2 py-3">
          <img
            src="/full-logo.png"
            alt="DineLine"
            className="h-20 w-auto"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== '/dashboard' && item.url !== '/settings' && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive}
                      className={cn(
                        "h-12 px-4 py-3 text-base rounded-lg transition-all duration-150",
                        "text-[#654321] font-medium",
                        "hover:bg-[#FFF0C2] hover:text-[#654321]",
                        isActive && "bg-[#FFE4B5] text-[#654321] font-semibold border-l-2 border-[#FF8C42]"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleSignOut}
          className="w-full justify-start h-12 px-4 py-3 text-base cursor-pointer rounded-lg text-[#654321] hover:bg-[#FFF0C2] transition-colors duration-150"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

