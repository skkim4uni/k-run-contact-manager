import { LogsPage } from "@/components/logs/LogsPage"
import { MobileLogs } from "@/components/mobile/MobileLogs"

export const metadata = {
  title: "미팅 로그 | K-run Contact Manager",
}

export default function LogsRoute() {
  return (
    <>
      <div className="hidden md:block">
        <LogsPage />
      </div>
      <div className="md:hidden h-[calc(100svh-4rem)] flex flex-col">
        <MobileLogs />
      </div>
    </>
  )
}
