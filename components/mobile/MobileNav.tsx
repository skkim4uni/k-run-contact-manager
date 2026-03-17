"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, CalendarClock } from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "대시보드", Icon: LayoutDashboard },
  { href: "/contacts", label: "연락처", Icon: Users },
  { href: "/logs", label: "미팅 로그", Icon: FileText },
  { href: "/scheduled", label: "미팅예정", Icon: CalendarClock },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
