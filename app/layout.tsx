import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { NavLinks } from "@/components/NavLinks"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "K-run Contact Manager",
  description: "VC 업무용 연락처 및 미팅 로그 통합 관리",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} antialiased min-h-screen bg-background font-sans`}>
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <nav className="max-w-[1600px] mx-auto px-6 h-14 flex items-center gap-8">
            <span className="font-semibold text-sm tracking-tight select-none">
              K-run Contact Manager
            </span>
            <NavLinks />
          </nav>
        </header>
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </body>
    </html>
  )
}
