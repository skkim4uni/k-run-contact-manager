import { ScheduledPage } from "@/components/scheduled/ScheduledPage"
import { MobileScheduled } from "@/components/mobile/MobileScheduled"

export default function ScheduledRoute() {
  return (
    <>
      <div className="hidden md:block">
        <ScheduledPage />
      </div>
      <div className="md:hidden h-[calc(100svh-4rem)] flex flex-col">
        <MobileScheduled />
      </div>
    </>
  )
}
