"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/contacts", label: "연락처" },
  { href: "/logs", label: "미팅 로그" },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
