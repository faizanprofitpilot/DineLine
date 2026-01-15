"use client"

import * as React from "react"
import { TopBar } from "./TopBar"
import { TabNav } from "./TabNav"

interface PlatformLayoutProps {
  children: React.ReactNode
  restaurantName?: string | null
}

export function PlatformLayout({ children, restaurantName }: PlatformLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FFFDF7' }}>
      <TopBar restaurantName={restaurantName} />
      <TabNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

