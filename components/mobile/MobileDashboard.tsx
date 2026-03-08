"use client"

import { useState, useMemo } from "react"
import { useContacts } from "@/hooks/useContacts"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import type { Contact } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, Bell, ArrowUp, ArrowDown } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function calcDaysOverdue(contact: Contact, today: string): number | null {
  if (!contact.contact_cycle) return null
  if (!contact.last_contact_date) return null
  const due = new Date(contact.last_contact_date)
  due.setDate(due.getDate() + contact.contact_cycle)
  return Math.max(0, Math.floor((new Date(today).getTime() - due.getTime()) / 86400000))
}

function isOverdue(contact: Contact, today: string): boolean {
  if (contact.excluded) return false
  if (!contact.contact_cycle) return false
  if (!contact.last_contact_date) return true
  const due = new Date(contact.last_contact_date)
  due.setDate(due.getDate() + contact.contact_cycle)
  return due <= new Date(today)
}

function DaysOverdueBadge({ days }: { days: number | null }) {
  if (days === null)
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">미컨택</Badge>
    )
  if (days === 0)
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">오늘</Badge>
    )
  const colorClass =
    days > 30
      ? "text-red-700 border-red-300 bg-red-50"
      : days > 7
      ? "text-orange-600 border-orange-300 bg-orange-50"
      : "text-amber-600 border-amber-300 bg-amber-50"
  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>D+{days}</Badge>
  )
}

function importanceBadgeClass(importance: string | null) {
  if (importance === "상") return "bg-red-100 text-red-700 border-red-200"
  if (importance === "중") return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-zinc-100 text-zinc-600 border-zinc-200"
}

// ─── Component ────────────────────────────────────────────────────────────────

type SortKey = "days_overdue" | "name" | "importance" | "last_contact_date" | "interest"
type SortDir = "asc" | "desc"

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  days_overdue: "desc",
  name: "asc",
  importance: "asc",
  last_contact_date: "asc",
  interest: "desc",
}

const SORT_LABELS: Record<SortKey, string> = {
  days_overdue: "초과일순",
  name: "이름순",
  importance: "중요도순",
  last_contact_date: "컨택일순",
  interest: "관심여부순",
}

const GROUP_TAGS = ["투자업계", "LP", "개인", "기타"] as const

export function MobileDashboard() {
  const { contacts, loading, editContact } = useContacts()
  const today = useMemo(getToday, [])

  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState("all")
  const [filterImportance, setFilterImportance] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("days_overdue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  function handleSortKeyChange(newKey: SortKey) {
    if (newKey === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(newKey)
      setSortDir(DEFAULT_DIR[newKey])
    }
  }

  const overdueAll = useMemo(
    () => contacts.filter((c) => isOverdue(c, today)),
    [contacts, today]
  )

  const filtered = useMemo(() => {
    let result = overdueAll
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.company?.toLowerCase() ?? "").includes(s)
      )
    }
    if (filterGroup !== "all") result = result.filter((c) => c.group_tag === filterGroup)
    if (filterImportance !== "all") result = result.filter((c) => c.importance === filterImportance)
    return result
  }, [overdueAll, search, filterGroup, filterImportance])

  const IMPORTANCE_ORDER: Record<string, number> = { 상: 0, 중: 1, 하: 2 }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "days_overdue") {
        const dA = calcDaysOverdue(a, today) ?? -Infinity
        const dB = calcDaysOverdue(b, today) ?? -Infinity
        return (dA - dB) * dir
      }
      if (sortKey === "name") {
        return a.name.localeCompare(b.name, "ko") * dir
      }
      if (sortKey === "importance") {
        const iA = IMPORTANCE_ORDER[a.importance ?? ""] ?? 99
        const iB = IMPORTANCE_ORDER[b.importance ?? ""] ?? 99
        return (iA - iB) * dir
      }
      if (sortKey === "last_contact_date") {
        const dA = a.last_contact_date ?? ""
        const dB = b.last_contact_date ?? ""
        if (!dA && !dB) return 0
        if (!dA) return 1
        if (!dB) return -1
        return dA < dB ? -dir : dA > dB ? dir : 0
      }
      if (sortKey === "interest") {
        const iA = a.interest ? 1 : 0
        const iB = b.interest ? 1 : 0
        return (iB - iA) * dir
      }
      return 0
    })
  }, [filtered, sortKey, sortDir, today])

  const openPanel = (contact: Contact) => {
    setSelectedContact(contact)
    setPanelOpen(true)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header strip */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-orange-600 shrink-0" />
        <span className="text-sm font-medium text-orange-700">연락 필요</span>
        <span className="ml-auto text-2xl font-bold text-orange-600">
          {loading ? "—" : overdueAll.length}
        </span>
        <span className="text-sm text-orange-600">명</span>
      </div>

      {/* Search + Sort */}
      <div className="px-4 py-3 flex gap-2 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 회사 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1">
          <Select
            value={sortKey}
            onValueChange={(v) => handleSortKeyChange(v as SortKey)}
          >
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                  {sortKey === key && (
                    <span className="ml-1 text-muted-foreground">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "오름차순" : "내림차순"}
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex gap-2 border-b">
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="그룹" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 그룹</SelectItem>
            {GROUP_TAGS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterImportance} onValueChange={setFilterImportance}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="중요도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 중요도</SelectItem>
            <SelectItem value="상">상</SelectItem>
            <SelectItem value="중">중</SelectItem>
            <SelectItem value="하">하</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-muted-foreground py-16 text-sm">불러오는 중...</p>
        ) : sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">
            {overdueAll.length === 0 ? "연락이 필요한 대상자가 없습니다." : "검색 결과가 없습니다."}
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((contact) => {
              const days = calcDaysOverdue(contact, today)
              return (
                <li key={contact.id}>
                  <button
                    className="w-full text-left px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                    onClick={() => openPanel(contact)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{contact.name}</span>
                          {contact.company && (
                            <span className="text-xs text-muted-foreground truncate">
                              {contact.company}
                            </span>
                          )}
                          {contact.position && (
                            <span className="text-xs text-muted-foreground">
                              · {contact.position}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {contact.group_tag && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              {contact.group_tag}
                            </Badge>
                          )}
                          {contact.importance && (
                            <Badge
                              variant="outline"
                              className={`text-xs h-5 px-1.5 ${importanceBadgeClass(contact.importance)}`}
                            >
                              {contact.importance}
                            </Badge>
                          )}
                          {contact.interest && (
                            <Badge
                              variant="outline"
                              className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
                            >
                              관심
                            </Badge>
                          )}
                          {contact.last_contact_date ? (
                            <span className="text-xs text-muted-foreground">
                              컨택: {contact.last_contact_date}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              컨택일 없음
                            </span>
                          )}
                        </div>
                      </div>
                      <DaysOverdueBadge days={days} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <MeetingLogPanel
        contact={selectedContact}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        today={today}
        onUpdateContact={editContact}
      />
    </div>
  )
}
