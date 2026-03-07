"use client"

import { useState, useMemo } from "react"
import { useContacts } from "@/hooks/useContacts"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import type { Contact } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, Bell } from "lucide-react"

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

type SortKey = "days_overdue" | "name" | "group_tag" | "last_contact_date"

export function MobileDashboard() {
  const { contacts, loading, editContact } = useContacts()
  const today = useMemo(getToday, [])

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("days_overdue")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const overdueAll = useMemo(
    () => contacts.filter((c) => isOverdue(c, today)),
    [contacts, today]
  )

  const filtered = useMemo(() => {
    if (!search) return overdueAll
    const s = search.toLowerCase()
    return overdueAll.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.company?.toLowerCase() ?? "").includes(s)
    )
  }, [overdueAll, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "days_overdue") {
        const dA = calcDaysOverdue(a, today) ?? Infinity
        const dB = calcDaysOverdue(b, today) ?? Infinity
        return dB - dA // desc
      }
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko")
      if (sortKey === "group_tag") {
        const gA = a.group_tag ?? ""
        const gB = b.group_tag ?? ""
        return gA.localeCompare(gB, "ko")
      }
      if (sortKey === "last_contact_date") {
        const lA = a.last_contact_date ?? ""
        const lB = b.last_contact_date ?? ""
        return lA.localeCompare(lB) // asc (오래된 순)
      }
      return 0
    })
  }, [filtered, sortKey, today])

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
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="days_overdue">초과일순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="group_tag">그룹순</SelectItem>
            <SelectItem value="last_contact_date">컨택일순</SelectItem>
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
                          {contact.last_contact_date && (
                            <span className="text-xs text-muted-foreground">
                              최근: {contact.last_contact_date}
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
