"use client"

import { useState, useMemo } from "react"
import { useContacts } from "@/hooks/useContacts"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { MeetingLogPanel } from "./MeetingLogPanel"
import type { Contact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Search, X, ArrowUpDown, Settings2, ChevronUp, ChevronDown,
  Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Bell, Star, Users,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SortCriterion {
  id: string
  field: keyof Contact
  direction: "asc" | "desc"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOGGLEABLE_COLUMNS: { key: keyof Contact; label: string }[] = [
  { key: "company", label: "회사" },
  { key: "department", label: "부서" },
  { key: "position", label: "직급" },
  { key: "email", label: "이메일" },
  { key: "phone", label: "전화번호" },
  { key: "group_tag", label: "그룹" },
  { key: "importance", label: "중요도" },
  { key: "interest", label: "관심여부" },
  { key: "excluded", label: "대상제외" },
  { key: "contact_cycle", label: "연락주기" },
  { key: "last_contact_date", label: "최근컨택일" },
  { key: "memo", label: "메모" },
  { key: "created_at", label: "등록일" },
]

const SORTABLE_FIELDS: { value: keyof Contact; label: string }[] = [
  { value: "name", label: "이름" },
  { value: "company", label: "회사" },
  { value: "group_tag", label: "그룹" },
  { value: "importance", label: "중요도" },
  { value: "contact_cycle", label: "연락주기" },
  { value: "last_contact_date", label: "최근컨택일" },
  { value: "created_at", label: "등록일" },
]

const GROUP_TAGS = ["투자업계", "LP", "개인", "기타"] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function calcDaysOverdue(contact: Contact, today: string): number {
  if (!contact.last_contact_date || !contact.contact_cycle) return 0
  const due = new Date(contact.last_contact_date)
  due.setDate(due.getDate() + contact.contact_cycle)
  return Math.max(0, Math.floor((new Date(today).getTime() - due.getTime()) / 86400000))
}

function isOverdue(contact: Contact, today: string): boolean {
  if (contact.excluded) return false
  if (!contact.contact_cycle) return false
  // 최근 컨택일이 없으면 한 번도 연락하지 않은 것 → 대상 포함
  if (!contact.last_contact_date) return true
  const due = new Date(contact.last_contact_date)
  due.setDate(due.getDate() + contact.contact_cycle)
  return due <= new Date(today)
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === "boolean") return Number(a) - Number(b as boolean)
  if (typeof a === "number") return a - (b as number)
  return String(a).localeCompare(String(b), "ko")
}

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

function renderCell(contact: Contact, key: keyof Contact): string {
  const val = contact[key]
  if (val === null || val === undefined || val === "") return "—"
  if (typeof val === "boolean") return val ? "✓" : "—"
  if (key === "contact_cycle") return `${val}일`
  return String(val)
}

function DaysOverdueBadge({ days }: { days: number | null }) {
  if (days === null)
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
        미컨택
      </Badge>
    )
  if (days === 0)
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 shrink-0">
        오늘
      </Badge>
    )
  const colorClass =
    days > 30
      ? "text-red-700 border-red-300 bg-red-50"
      : days > 7
      ? "text-orange-600 border-orange-300 bg-orange-50"
      : "text-amber-600 border-amber-300 bg-amber-50"
  return (
    <Badge variant="outline" className={`text-xs shrink-0 ${colorClass}`}>
      D+{days}
    </Badge>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { contacts, loading, editContact } = useContacts()
  const today = useMemo(getToday, [])

  // Search (비저장)
  const [search, setSearch] = useState("")

  // Filter (localStorage)
  const [filterGroup, setFilterGroup] = useLocalStorage("krun:dash:filter:group", "all")
  const [filterImportance, setFilterImportance] = useLocalStorage("krun:dash:filter:importance", "all")
  const [filterInterest, setFilterInterest] = useLocalStorage("krun:dash:filter:interest", "all")

  // Sort
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [sortCriteria, setSortCriteria] = useLocalStorage<SortCriterion[]>("krun:dash:sort", [])

  // Columns
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorage<string[]>(
    "krun:dash:columns",
    ["days_overdue", ...TOGGLEABLE_COLUMNS.map((c) => c.key)]
  )
  const visibleColumns = useMemo(() => new Set(visibleColumnKeys), [visibleColumnKeys])

  // Pagination
  const [pageSize, setPageSize] = useLocalStorage<number>("krun:dash:page:size", 20)
  const [currentPage, setCurrentPage] = useState(1)

  // Meeting log panel
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // ─── 연락 필요 대상자 (검색/필터 이전 전체) ───────────────────────
  const overdueAll = useMemo(
    () => contacts.filter((c) => isOverdue(c, today)),
    [contacts, today]
  )

  // ─── 요약 통계 ─────────────────────────────────────────────────────
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tag of GROUP_TAGS) {
      counts[tag] = overdueAll.filter((c) => c.group_tag === tag).length
    }
    return counts
  }, [overdueAll])

  const interestCount = useMemo(
    () => contacts.filter((c) => c.interest === true).length,
    [contacts]
  )

  // ─── 검색 + 필터 ───────────────────────────────────────────────────
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
    if (filterInterest === "yes") result = result.filter((c) => c.interest === true)
    else if (filterInterest === "no") result = result.filter((c) => c.interest !== true)
    return result
  }, [overdueAll, search, filterGroup, filterImportance, filterInterest])

  // ─── 정렬 ─────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const base = [...filtered].sort(
      (a, b) =>
        calcDaysOverdue(b, today) - calcDaysOverdue(a, today) // 기본: 초과일 내림차순
    )
    if (sortCriteria.length === 0) return base
    return base.sort((a, b) => {
      for (const criterion of sortCriteria) {
        const cmp = compareValues(a[criterion.field], b[criterion.field])
        if (cmp !== 0) return criterion.direction === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [filtered, sortCriteria, today])

  // ─── 페이지네이션 ──────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ─── Sort panel ────────────────────────────────────────────────────
  const addSortCriterion = () => {
    const usedFields = new Set(sortCriteria.map((c) => c.field))
    const available = SORTABLE_FIELDS.find((f) => !usedFields.has(f.value))
    if (!available) return
    setSortCriteria((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: available.value, direction: "asc" },
    ])
  }

  const removeSortCriterion = (id: string) =>
    setSortCriteria((prev) => prev.filter((c) => c.id !== id))

  const updateSortCriterion = (id: string, updates: Partial<SortCriterion>) =>
    setSortCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))

  const moveSortCriterion = (id: string, dir: "up" | "down") => {
    setSortCriteria((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      const newIdx = dir === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }

  const hasActiveFilter =
    search || filterGroup !== "all" || filterImportance !== "all" || filterInterest !== "all"

  const resetFilters = () => {
    setSearch("")
    setFilterGroup("all")
    setFilterImportance("all")
    setFilterInterest("all")
  }

  const visibleToggleableCols = TOGGLEABLE_COLUMNS.filter((c) => visibleColumns.has(c.key))

  const openPanel = (contact: Contact) => {
    setSelectedContact(contact)
    setPanelOpen(true)
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <span className="text-sm text-muted-foreground">기준일: {today}</span>
      </div>

      {/* ─── 요약 카드 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 연락 필요 전체 → 필터 초기화 */}
        <Card
          className={`lg:col-span-1 border-orange-200 bg-orange-50/50 cursor-pointer transition-shadow hover:shadow-md ${
            filterGroup === "all" && filterInterest === "all" ? "ring-2 ring-orange-400" : ""
          }`}
          onClick={() => { setFilterGroup("all"); setFilterInterest("all"); setCurrentPage(1) }}
        >
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-orange-600 flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" />
              연락 필요
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-orange-600">
              {loading ? "—" : overdueAll.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">명</p>
          </CardContent>
        </Card>

        {/* 그룹별 카운트 → filterGroup 설정 */}
        {GROUP_TAGS.map((tag) => (
          <Card
            key={tag}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              filterGroup === tag ? "ring-2 ring-zinc-400 border-zinc-400" : "border-zinc-200"
            }`}
            onClick={() => {
              setFilterGroup(filterGroup === tag ? "all" : tag)
              setFilterInterest("all")
              setCurrentPage(1)
            }}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {tag}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">
                {loading ? "—" : groupCounts[tag]}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">명</p>
            </CardContent>
          </Card>
        ))}

        {/* 관심 연락처 → filterInterest 설정 */}
        <Card
          className={`border-blue-200 bg-blue-50/50 cursor-pointer transition-shadow hover:shadow-md ${
            filterInterest === "yes" ? "ring-2 ring-blue-400" : ""
          }`}
          onClick={() => {
            setFilterInterest(filterInterest === "yes" ? "all" : "yes")
            setFilterGroup("all")
            setCurrentPage(1)
          }}
        >
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              관심 연락처
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-blue-600">
              {loading ? "—" : interestCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">명 (전체)</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 검색 + 필터 ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 회사 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="pl-8 w-56"
          />
        </div>

        <Select value={filterGroup} onValueChange={(v) => { setFilterGroup(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="전체 그룹" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 그룹</SelectItem>
            {GROUP_TAGS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterImportance} onValueChange={(v) => { setFilterImportance(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="전체 중요도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 중요도</SelectItem>
            <SelectItem value="상">상</SelectItem>
            <SelectItem value="중">중</SelectItem>
            <SelectItem value="하">하</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterInterest} onValueChange={(v) => { setFilterInterest(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="관심여부" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">관심여부 전체</SelectItem>
            <SelectItem value="yes">관심 있음</SelectItem>
            <SelectItem value="no">관심 없음</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        )}
      </div>

      {/* ─── 정렬 + 컬럼 관리 ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showSortPanel ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSortPanel((p) => !p)}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          정렬 관리
          {sortCriteria.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {sortCriteria.length}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1" />
              컬럼 관리
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuCheckboxItem
              checked={visibleColumns.has("days_overdue")}
              onCheckedChange={(checked) =>
                setVisibleColumnKeys((prev) => {
                  const next = new Set(prev)
                  checked ? next.add("days_overdue") : next.delete("days_overdue")
                  return [...next]
                })
              }
            >
              초과일
            </DropdownMenuCheckboxItem>
            {TOGGLEABLE_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.has(col.key)}
                onCheckedChange={(checked) =>
                  setVisibleColumnKeys((prev) => {
                    const next = new Set(prev)
                    checked ? next.add(col.key) : next.delete(col.key)
                    return [...next]
                  })
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 ml-auto">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10개</SelectItem>
              <SelectItem value="20">20개</SelectItem>
              <SelectItem value="50">50개</SelectItem>
              <SelectItem value="100">100개</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">
            총 {sorted.length}명
            {filtered.length !== overdueAll.length && ` (필터 적용)`}
          </span>
        </div>
      </div>

      {/* ─── 정렬 패널 ──────────────────────────────────────────────── */}
      {showSortPanel && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">정렬 기준</span>
            <div className="flex items-center gap-2">
              {sortCriteria.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSortCriteria([])}
                >
                  <X className="h-3 w-3 mr-1" />
                  전체 초기화
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addSortCriterion}
                disabled={sortCriteria.length >= SORTABLE_FIELDS.length}
              >
                <Plus className="h-3 w-3 mr-1" />
                기준 추가
              </Button>
            </div>
          </div>

          {sortCriteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              기준 없음 (기본: 초과일 내림차순). 기준을 추가하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {sortCriteria.map((criterion, idx) => (
                <div key={criterion.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <Select
                    value={criterion.field}
                    onValueChange={(field) =>
                      updateSortCriterion(criterion.id, { field: field as keyof Contact })
                    }
                  >
                    <SelectTrigger className="w-32 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTABLE_FIELDS.map((f) => (
                        <SelectItem
                          key={f.value}
                          value={f.value}
                          disabled={
                            criterion.field !== f.value &&
                            sortCriteria.some((c) => c.field === f.value)
                          }
                        >
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={criterion.direction}
                    onValueChange={(dir) =>
                      updateSortCriterion(criterion.id, { direction: dir as "asc" | "desc" })
                    }
                  >
                    <SelectTrigger className="w-24 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">오름차순</SelectItem>
                      <SelectItem value="desc">내림차순</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => moveSortCriterion(criterion.id, "up")}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => moveSortCriterion(criterion.id, "down")}
                    disabled={idx === sortCriteria.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeSortCriterion(criterion.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 테이블 ─────────────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {visibleColumns.has("days_overdue") && (
                  <TableHead className="sticky left-0 z-20 bg-muted/50 w-[72px] whitespace-nowrap">
                    초과일
                  </TableHead>
                )}
                <TableHead
                  className={`sticky z-20 bg-muted/50 min-w-[120px] font-semibold ${
                    visibleColumns.has("days_overdue") ? "left-[72px]" : "left-0"
                  }`}
                >
                  이름
                </TableHead>
                {visibleToggleableCols.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap min-w-[100px]">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={(visibleColumns.has("days_overdue") ? 1 : 0) + 1 + visibleToggleableCols.length}
                    className="text-center py-16 text-muted-foreground"
                  >
                    불러오는 중...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(visibleColumns.has("days_overdue") ? 1 : 0) + 1 + visibleToggleableCols.length}
                    className="text-center py-16 text-muted-foreground"
                  >
                    {overdueAll.length === 0
                      ? "연락이 필요한 대상자가 없습니다."
                      : "검색/필터 결과가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((contact) => {
                  const days = contact.last_contact_date ? calcDaysOverdue(contact, today) : null
                  return (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => openPanel(contact)}
                    >
                      {visibleColumns.has("days_overdue") && (
                        <TableCell className="sticky left-0 z-10 bg-background w-[72px]">
                          <DaysOverdueBadge days={days} />
                        </TableCell>
                      )}
                      <TableCell
                        className={`sticky z-10 bg-background font-medium min-w-[120px] ${
                          visibleColumns.has("days_overdue") ? "left-[72px]" : "left-0"
                        }`}
                      >
                        {contact.name}
                      </TableCell>
                      {visibleToggleableCols.map((col) => (
                        <TableCell
                          key={col.key}
                          className="max-w-[200px] truncate text-sm"
                          title={renderCell(contact, col.key)}
                        >
                          {renderCell(contact, col.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── 페이지네이션 ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sorted.length > 0
            ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} / 총 ${sorted.length}명`
            : "0명"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentPage(1)} disabled={safePage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPaginationPages(safePage, totalPages).map((page, i) =>
            page === "..." ? (
              <span key={`e-${i}`} className="px-1.5 text-sm text-muted-foreground">…</span>
            ) : (
              <Button
                key={`p-${page}`}
                variant={page === safePage ? "default" : "outline"}
                size="icon" className="h-8 w-8 text-sm"
                onClick={() => setCurrentPage(page as number)}
              >
                {page}
              </Button>
            )
          )}
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── 미팅 로그 패널 ──────────────────────────────────────────── */}
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
