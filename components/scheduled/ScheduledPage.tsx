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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "meeting_date" | "name" | "company"
type SortDir = "asc" | "desc"

interface SortCriteria {
  field: SortField
  dir: SortDir
}

const SORT_FIELD_LABELS: Record<SortField, string> = {
  meeting_date: "미팅 예정일",
  name: "이름",
  company: "회사",
}

const SORT_FIELD_OPTIONS: SortField[] = ["meeting_date", "name", "company"]

const DEFAULT_SORT: SortCriteria[] = [{ field: "meeting_date", dir: "asc" }]

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

export function ScheduledPage() {
  const [logs, setLogs] = useState<MeetingLogWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>(DEFAULT_SORT)
  const [sortPanelOpen, setSortPanelOpen] = useState(false)
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
      for (const { field, dir } of sortCriteria) {
        const cmp = compareValues(getFieldValue(a, field), getFieldValue(b, field))
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [logs, sortCriteria])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleRowClick = (log: MeetingLogWithContact) => {
    setSelectedContact(log.contacts)
    setPanelOpen(true)
  }

  const handleUpdateContact = async (id: string, data: ContactUpdate) => {
    await updateContact(id, data)
    const updated = await getScheduledMeetings(today)
    setLogs(updated)
  }

  // Sort panel helpers
  const usedFields = sortCriteria.map((c) => c.field)
  const availableFields = SORT_FIELD_OPTIONS.filter((f) => !usedFields.includes(f))

  const addSort = () => {
    if (availableFields.length === 0) return
    setSortCriteria((prev) => [...prev, { field: availableFields[0], dir: "asc" }])
  }

  const removeSort = (index: number) => {
    setSortCriteria((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length === 0 ? DEFAULT_SORT : next
    })
  }

  const updateSortField = (index: number, field: SortField) => {
    setSortCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, field } : c))
    )
  }

  const toggleSortDir = (index: number) => {
    setSortCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, dir: c.dir === "asc" ? "desc" : "asc" } : c))
    )
  }

  const moveSortUp = (index: number) => {
    if (index === 0) return
    setSortCriteria((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveSortDown = (index: number) => {
    setSortCriteria((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const todayCount = logs.filter((l) => l.meeting_date === today).length

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">미팅 예정</h1>
          {todayCount > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">
              오늘 미팅 {todayCount}건 예정
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 정렬 관리 */}
          <div className="relative">
            <Button
              variant={sortPanelOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setSortPanelOpen((v) => !v)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              정렬 관리
              {sortCriteria.length > 0 && (
                <span className="ml-0.5 bg-primary/20 text-primary rounded-full text-xs px-1.5">
                  {sortCriteria.length}
                </span>
              )}
            </Button>
            {sortPanelOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg p-3 w-80 space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">정렬 기준</div>
                {sortCriteria.map((crit, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        className="h-4 w-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveSortUp(i)}
                        disabled={i === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        className="h-4 w-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveSortDown(i)}
                        disabled={i === sortCriteria.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Select
                      value={crit.field}
                      onValueChange={(v) => updateSortField(i, v as SortField)}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={crit.field}>
                          {SORT_FIELD_LABELS[crit.field]}
                        </SelectItem>
                        {availableFields.map((f) => (
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
                      onClick={() => toggleSortDir(i)}
                      title={crit.dir === "asc" ? "오름차순" : "내림차순"}
                    >
                      {crit.dir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSort(i)}
                      disabled={sortCriteria.length === 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {availableFields.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 gap-1 text-muted-foreground"
                    onClick={addSort}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    정렬 기준 추가
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 페이지 크기 */}
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
            총 {sorted.length}건
          </span>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
        오늘 미팅 예정
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium w-52">미팅 예정일</th>
              <th className="text-left px-4 py-2.5 font-medium w-32">이름</th>
              <th className="text-left px-4 py-2.5 font-medium w-40">회사</th>
              <th className="text-left px-4 py-2.5 font-medium w-36">전화번호</th>
              <th className="text-left px-4 py-2.5 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  예정된 미팅이 없습니다.
                </td>
              </tr>
            ) : (
              paginated.map((log) => {
                const isToday = log.meeting_date === today
                return (
                  <tr
                    key={log.id}
                    className={cn(
                      "border-t cursor-pointer transition-colors",
                      isToday
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "hover:bg-muted/30"
                    )}
                    onClick={() => handleRowClick(log)}
                  >
                    <td className="px-4 py-3 tabular-nums font-medium whitespace-nowrap">
                      <span className={cn(isToday && "text-amber-700 font-semibold")}>
                        {log.meeting_date}
                      </span>
                      {isToday && (
                        <span className="ml-2 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                          오늘
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.contacts?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.contacts?.company ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {log.contacts?.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-0">
                      <p className="truncate">
                        {log.contacts?.memo ? (
                          log.contacts.memo
                        ) : (
                          <span className="italic text-muted-foreground/50">-</span>
                        )}
                      </p>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sorted.length > 0
            ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / 총 ${sorted.length}건`
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
