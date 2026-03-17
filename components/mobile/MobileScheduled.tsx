"use client"

import { useState, useEffect, useMemo } from "react"
import { getScheduledMeetings, updateContact } from "@/lib/supabase"
import type { MeetingLogWithContact, Contact, ContactUpdate } from "@/lib/types"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "meeting_date" | "name" | "company"
type SortDir = "asc" | "desc"

const SORT_FIELD_LABELS: Record<SortField, string> = {
  meeting_date: "미팅 예정일",
  name: "이름",
  company: "회사",
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "string" && typeof b === "string")
    return a.localeCompare(b, "ko")
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function getFieldValue(log: MeetingLogWithContact, field: SortField): unknown {
  if (field === "meeting_date") return log.meeting_date
  if (field === "name") return log.contacts?.name ?? null
  if (field === "company") return log.contacts?.company ?? null
  return null
}

export function MobileScheduled() {
  const [logs, setLogs] = useState<MeetingLogWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("meeting_date")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await getScheduledMeetings(today)
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => {
      const cmp = compareValues(getFieldValue(a, sortField), getFieldValue(b, sortField))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [logs, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const todayCount = logs.filter((l) => l.meeting_date === today).length

  const handleCardTap = (log: MeetingLogWithContact) => {
    setSelectedContact(log.contacts)
    setPanelOpen(true)
  }

  const handleUpdateContact = async (id: string, data: ContactUpdate) => {
    await updateContact(id, data)
    const updated = await getScheduledMeetings(today)
    setLogs(updated)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="bg-background border-b px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">미팅 예정</h1>
            {todayCount > 0 && (
              <p className="text-xs text-amber-600">오늘 {todayCount}건 예정</p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">총 {sorted.length}건</span>
        </div>

        {/* 정렬 */}
        <div className="flex items-center gap-2">
          <Select
            value={sortField}
            onValueChange={(v) => {
              setSortField(v as SortField)
              setPage(1)
            }}
          >
            <SelectTrigger className="flex-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_FIELD_LABELS) as SortField[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {SORT_FIELD_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "오름차순" : "내림차순"}
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}개
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            불러오는 중...
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            예정된 미팅이 없습니다.
          </div>
        ) : (
          <div className="divide-y">
            {paginated.map((log) => {
              const isToday = log.meeting_date === today
              return (
                <div
                  key={log.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer active:opacity-70 transition-colors",
                    isToday ? "bg-amber-50" : "bg-background"
                  )}
                  onClick={() => handleCardTap(log)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">
                          {log.contacts?.name}
                        </span>
                        {log.contacts?.company && (
                          <span className="text-xs text-muted-foreground truncate">
                            {log.contacts.company}
                          </span>
                        )}
                      </div>
                      {log.contacts?.memo && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {log.contacts.memo}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "text-xs tabular-nums font-medium",
                          isToday ? "text-amber-700" : "text-muted-foreground"
                        )}
                      >
                        {log.meeting_date}
                      </span>
                      {isToday && (
                        <div className="mt-0.5 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-center">
                          오늘
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="shrink-0 border-t bg-background px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {safePage} / {totalPages} 페이지
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <MeetingLogPanel
        contact={selectedContact}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        today={today}
        onUpdateContact={handleUpdateContact}
      />
    </div>
  )
}
