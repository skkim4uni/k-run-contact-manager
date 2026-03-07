import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { MobileDashboard } from "@/components/mobile/MobileDashboard"

export const metadata = {
  title: "대시보드 | K-run Contact Manager",
}

export default function Home() {
  return (
    <>
      <div className="hidden md:block">
        <DashboardPage />
      </div>
      <div className="md:hidden h-[calc(100svh-4rem)] flex flex-col">
        <MobileDashboard />
      </div>
    </>
  )
}
