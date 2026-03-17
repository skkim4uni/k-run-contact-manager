"use client"

import { useState, useEffect, useMemo } from "react"
import { getAllMeetingLogs, updateContact } from "@/lib/supabase"
import type { MeetingLogWithContact, Contact, ContactUpdate } from "@/lib/types"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export function LogsPage() {
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
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleRowClick = (log: MeetingLogWithContact) => {
    setSelectedContact(log.contacts)
    setPanelOpen(true)
  }

  const handleUpdateContact = async (id: string, data: ContactUpdate) => {
    await updateContact(id, data)
    const updated = await getAllMeetingLogs()
    setLogs(updated)
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-4">
      <h1 className="text-xl font-semibold">미팅 로그 전체</h1>

      {/* 검색 + 페이지 크기 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 내용 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-24">
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
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          총 {filtered.length}건
        </span>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium w-32">컨택일</th>
              <th className="text-left px-4 py-2.5 font-medium w-32">이름</th>
              <th className="text-left px-4 py-2.5 font-medium">내용</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  {search ? "검색 결과가 없습니다." : "미팅 로그가 없습니다."}
                </td>
              </tr>
            ) : (
              paginated.map((log) => (
                <tr
                  key={log.id}
                  className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(log)}
                >
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {log.meeting_date}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.contacts?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-0">
                    <p className="truncate">
                      {log.contents ? (
                        log.contents
                      ) : (
                        <span className="italic text-muted-foreground/60">내용 없음</span>
                      )}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {filtered.length > 0
            ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} / 총 ${filtered.length}건`
            : "0건"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setPage(1)} disabled={safePage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPaginationPages(safePage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`e-${i}`} className="px-1.5 text-sm text-muted-foreground">…</span>
              ) : (
                <Button
                  key={`p-${p}`}
                  variant={p === safePage ? "default" : "outline"}
                  size="icon" className="h-8 w-8 text-sm"
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

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
