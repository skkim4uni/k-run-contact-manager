"use client"

import { useState, useEffect, useMemo } from "react"
import { getAllMeetingLogs, updateContact } from "@/lib/supabase"
import type { MeetingLogWithContact, Contact, ContactUpdate } from "@/lib/types"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function MobileLogs() {
  const [logs, setLogs] = useState<MeetingLogWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    try {
      setLoading(true)
      const data = await getAllMeetingLogs()
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs
      .filter((log) => log.meeting_date <= today)
      .filter(
        (log) =>
          !q ||
          log.contacts?.name?.toLowerCase().includes(q) ||
          log.contents?.toLowerCase().includes(q)
      )
  }, [logs, search, today])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleCardTap = (log: MeetingLogWithContact) => {
    setSelectedContact(log.contacts)
    setPanelOpen(true)
  }

  const handleUpdateContact = async (id: string, data: ContactUpdate) => {
    await updateContact(id, data)
    const updated = await getAllMeetingLogs()
    setLogs(updated)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">미팅 로그 전체</h1>
          <span className="text-xs text-muted-foreground">총 {filtered.length}건</span>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 내용 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* 페이지 크기 */}
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}개
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages} 페이지
          </span>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">불러오는 중...</p>
        ) : paginated.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {search ? "검색 결과가 없습니다." : "미팅 로그가 없습니다."}
          </p>
        ) : (
          paginated.map((log) => (
            <button
              key={log.id}
              className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
              onClick={() => handleCardTap(log)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{log.contacts?.name}</span>
                  </div>
                  {log.contents ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {log.contents}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">내용 없음</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {log.meeting_date}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="border-t px-4 py-2 flex items-center justify-between bg-background">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            이전
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
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
