"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useContacts } from "@/hooks/useContacts"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { ContactModal } from "./ContactModal"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Search, Upload, Plus, Trash2, ChevronUp, ChevronDown,
  X, Settings2, ArrowUpDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
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
  { value: "department", label: "부서" },
  { value: "position", label: "직급" },
  { value: "group_tag", label: "그룹" },
  { value: "importance", label: "중요도" },
  { value: "contact_cycle", label: "연락주기" },
  { value: "last_contact_date", label: "최근컨택일" },
  { value: "created_at", label: "등록일" },
]

const CSV_HEADER_MAP: Record<string, keyof ContactInsert> = {
  name: "name", 이름: "name",
  company: "company", 회사: "company",
  department: "department", 부서: "department",
  position: "position", 직급: "position",
  email: "email", 이메일: "email",
  phone: "phone", 전화번호: "phone",
  group_tag: "group_tag", 그룹: "group_tag",
  importance: "importance", 중요도: "importance",
  // 노션: "관심" / 일반: "관심여부"
  interest: "interest", 관심여부: "interest", 관심: "interest",
  excluded: "excluded", 대상제외: "excluded",
  contact_cycle: "contact_cycle", 연락주기: "contact_cycle",
  last_contact_date: "last_contact_date", 최근컨택일: "last_contact_date",
  memo: "memo", 메모: "memo",
  // 노션: "생성일" / 일반: "등록일"
  created_at: "created_at", 등록일: "created_at", 생성일: "created_at",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * RFC 4180 준수 CSV 파서.
 * - 줄바꿈이 포함된 quoted 필드를 정확히 처리
 * - 헤더 수와 필드 수가 다를 경우 빈값으로 처리
 * - \r\n / \r / \n 모두 지원
 */
function parseCSV(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  // 마지막 행을 자동으로 flush 하기 위해 sentinel "\n" 추가
  const src = normalized.endsWith("\n") ? normalized : normalized + "\n"

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        // escaped quote ("")
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      row.push(field.trim())
      field = ""
    } else if (ch === "\n" && !inQuotes) {
      row.push(field.trim())
      field = ""
      // 완전히 빈 행(빈 줄)은 건너뜀
      if (row.some((v) => v !== "")) {
        rows.push(row)
      }
      row = []
    } else {
      // quoted 필드 내부의 \n 포함 모든 문자를 그대로 누적
      field += ch
    }
  }

  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {}
    headers.forEach((h, i) => {
      record[h] = values[i] ?? ""
    })
    return record
  })
}

function parseBool(val: string): boolean {
  // 노션 체크박스는 "☑" 또는 빈값으로 export 됨
  return ["true", "1", "y", "yes", "예", "o", "☑", "✓", "checked"].includes(
    val.toLowerCase().trim()
  )
}

function csvRowToContact(row: Record<string, string>): ContactInsert | null {
  const mapped: Partial<Record<keyof ContactInsert, unknown>> = {}
  for (const [csvKey, value] of Object.entries(row)) {
    const field = CSV_HEADER_MAP[csvKey]
    if (!field || value === "") continue
    if (field === "interest" || field === "excluded") {
      mapped[field] = parseBool(value)
    } else if (field === "contact_cycle") {
      const n = parseInt(value)
      if (!isNaN(n)) mapped[field] = n
    } else {
      mapped[field] = value || null
    }
  }
  if (!mapped.name) return null
  return {
    name: mapped.name as string,
    company: (mapped.company as string) ?? null,
    department: (mapped.department as string) ?? null,
    position: (mapped.position as string) ?? null,
    email: (mapped.email as string) ?? null,
    phone: (mapped.phone as string) ?? null,
    group_tag: (mapped.group_tag as ContactInsert["group_tag"]) ?? null,
    importance: (mapped.importance as ContactInsert["importance"]) ?? null,
    interest: (mapped.interest as boolean) ?? null,
    excluded: (mapped.excluded as boolean) ?? null,
    contact_cycle: (mapped.contact_cycle as number) ?? null,
    last_contact_date: (mapped.last_contact_date as string) ?? null,
    memo: (mapped.memo as string) ?? null,
    created_at: (mapped.created_at as string) ?? null,
  }
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactsPage() {
  const { contacts, loading, error, addContact, editContact, removeContact } = useContacts()

  // Search (비저장 — 매 방문마다 초기화)
  const [search, setSearch] = useState("")

  // Filter (localStorage 저장)
  const [filterGroup, setFilterGroup] = useLocalStorage("krun:filter:group", "all")
  const [filterImportance, setFilterImportance] = useLocalStorage("krun:filter:importance", "all")
  const [filterExcluded, setFilterExcluded] = useLocalStorage("krun:filter:excluded", "all")
  const [filterInterest, setFilterInterest] = useLocalStorage("krun:filter:interest", "all")

  // Sort panel (localStorage 저장)
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [sortCriteria, setSortCriteria] = useLocalStorage<SortCriterion[]>("krun:sort:criteria", [])

  // Columns (string[] 로 저장 후 Set으로 변환)
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorage<string[]>(
    "krun:columns:visible",
    TOGGLEABLE_COLUMNS.map((c) => c.key)
  )
  const visibleColumns = useMemo(() => new Set(visibleColumnKeys), [visibleColumnKeys])

  // Pagination (localStorage 저장)
  const [pageSize, setPageSize] = useLocalStorage<number>("krun:page:size", 20)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Meeting log panel
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  // CSV
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvResult, setCsvResult] = useState<{ added: number; skipped: number } | null>(null)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterGroup, filterImportance, filterExcluded, filterInterest])

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = contacts
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
    if (filterExcluded === "yes") result = result.filter((c) => c.excluded === true)
    else if (filterExcluded === "no") result = result.filter((c) => c.excluded !== true)
    if (filterInterest === "yes") result = result.filter((c) => c.interest === true)
    else if (filterInterest === "no") result = result.filter((c) => c.interest !== true)
    return result
  }, [contacts, search, filterGroup, filterImportance, filterExcluded, filterInterest])

  // ─── Sorting ────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    if (sortCriteria.length === 0) return filtered
    return [...filtered].sort((a, b) => {
      for (const criterion of sortCriteria) {
        const cmp = compareValues(a[criterion.field], b[criterion.field])
        if (cmp !== 0) return criterion.direction === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [filtered, sortCriteria])

  // ─── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ─── Selection ──────────────────────────────────────────────────────────────

  const allPageSelected =
    paginated.length > 0 && paginated.every((c) => selectedIds.has(c.id))
  const somePageSelected = paginated.some((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) paginated.forEach((c) => next.delete(c.id))
      else paginated.forEach((c) => next.add(c.id))
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Sort panel ─────────────────────────────────────────────────────────────

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

  // ─── Modal ──────────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingContact(null)
    setModalOpen(true)
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setModalOpen(true)
  }

  const handleSave = async (data: ContactInsert | ContactUpdate) => {
    if (editingContact) {
      await editContact(editingContact.id, data as ContactUpdate)
    } else {
      await addContact(data as ContactInsert)
    }
  }

  const handleDeleteFromModal = async (id: string) => {
    await removeContact(id)
  }

  // ─── Bulk delete ────────────────────────────────────────────────────────────

  const confirmBulkDelete = async () => {
    setDeletingBulk(true)
    try {
      for (const id of selectedIds) {
        await removeContact(id)
      }
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } finally {
      setDeletingBulk(false)
    }
  }

  // ─── CSV upload ─────────────────────────────────────────────────────────────

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const text = await file.text()
    const rows = parseCSV(text)

    const existingEmails = new Set(
      contacts.filter((c) => c.email).map((c) => c.email!.toLowerCase())
    )
    const existingNameCompany = new Set(
      contacts.map((c) => `${c.name}|${c.company ?? ""}`)
    )

    let added = 0
    let skipped = 0

    for (const row of rows) {
      const contact = csvRowToContact(row)
      if (!contact) { skipped++; continue }

      const isDuplicate =
        (contact.email && existingEmails.has(contact.email.toLowerCase())) ||
        existingNameCompany.has(`${contact.name}|${contact.company ?? ""}`)

      if (isDuplicate) { skipped++; continue }

      try {
        await addContact(contact)
        if (contact.email) existingEmails.add(contact.email.toLowerCase())
        existingNameCompany.add(`${contact.name}|${contact.company ?? ""}`)
        added++
      } catch {
        skipped++
      }
    }

    setCsvResult({ added, skipped })
    setTimeout(() => setCsvResult(null), 5000)
  }

  // ─── Filter active check ────────────────────────────────────────────────────

  const hasActiveFilter =
    search ||
    filterGroup !== "all" ||
    filterImportance !== "all" ||
    filterExcluded !== "all" ||
    filterInterest !== "all"

  const resetFilters = () => {
    setSearch("")
    setFilterGroup("all")
    setFilterImportance("all")
    setFilterExcluded("all")
    setFilterInterest("all")
  }

  const visibleToggleableCols = TOGGLEABLE_COLUMNS.filter((c) => visibleColumns.has(c.key))

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">연락처 관리</h1>
        <span className="text-sm text-muted-foreground">
          총 {contacts.length}명
          {filtered.length !== contacts.length && ` (필터 적용: ${filtered.length}명)`}
        </span>
      </div>

      {/* Toolbar Row 1: Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 회사 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-56"
          />
        </div>

        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="전체 그룹" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 그룹</SelectItem>
            <SelectItem value="투자업계">투자업계</SelectItem>
            <SelectItem value="LP">LP</SelectItem>
            <SelectItem value="개인">개인</SelectItem>
            <SelectItem value="기타">기타</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterImportance} onValueChange={setFilterImportance}>
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

        <Select value={filterExcluded} onValueChange={setFilterExcluded}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="대상제외" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">대상제외 전체</SelectItem>
            <SelectItem value="no">제외 안 됨</SelectItem>
            <SelectItem value="yes">제외 대상</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterInterest} onValueChange={setFilterInterest}>
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

      {/* Toolbar Row 2: Sort, Columns, Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort panel toggle */}
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

        {/* Column manager */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1" />
              컬럼 관리
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
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

        {/* Right-side actions */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {selectedIds.size}건 삭제
            </Button>
          )}

          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setCurrentPage(1)
            }}
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

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleCSVUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            CSV 업로드
          </Button>

          <Button size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" />
            새 연락처
          </Button>
        </div>
      </div>

      {/* CSV result notice */}
      {csvResult && (
        <div className="flex items-center justify-between text-sm bg-muted rounded-md px-4 py-2">
          <span>
            CSV 업로드 완료 —{" "}
            <strong>{csvResult.added}건 추가</strong>,{" "}
            {csvResult.skipped}건 건너뜀 (중복/오류)
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCsvResult(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Sort Panel */}
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
              정렬 기준이 없습니다. 기준을 추가하세요.
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
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => moveSortCriterion(criterion.id, "up")}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => moveSortCriterion(criterion.id, "down")}
                    disabled={idx === sortCriteria.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
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

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[42px] sticky left-0 z-20 bg-muted/50">
                  <Checkbox
                    checked={
                      allPageSelected
                        ? true
                        : somePageSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="현재 페이지 전체 선택"
                  />
                </TableHead>
                <TableHead className="sticky left-[42px] z-20 bg-muted/50 min-w-[120px] font-semibold">
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
                    colSpan={2 + visibleToggleableCols.length}
                    className="text-center py-16 text-muted-foreground"
                  >
                    불러오는 중...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2 + visibleToggleableCols.length}
                    className="text-center py-16 text-muted-foreground"
                  >
                    {contacts.length === 0
                      ? "등록된 연락처가 없습니다."
                      : "검색/필터 결과가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors ${
                      selectedIds.has(contact.id) ? "bg-muted/30" : ""
                    }`}
                    onClick={() => openEditModal(contact)}
                  >
                    <TableCell
                      className="sticky left-0 z-10 bg-background w-[42px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => toggleSelect(contact.id)}
                        aria-label={`${contact.name} 선택`}
                      />
                    </TableCell>
                    <TableCell className="sticky left-[42px] z-10 bg-background font-medium min-w-[120px]">
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sorted.length > 0
            ? `${(safePage - 1) * pageSize + 1}–${Math.min(
                safePage * pageSize,
                sorted.length
              )} / 총 ${sorted.length}명`
            : "0명"}
          {selectedIds.size > 0 && ` · ${selectedIds.size}건 선택됨`}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={safePage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPaginationPages(safePage, totalPages).map((page, i) =>
            page === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1.5 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={`page-${page}`}
                variant={page === safePage ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-sm"
                onClick={() => setCurrentPage(page as number)}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safePage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contact add/edit modal */}
      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contact={editingContact}
        onSave={handleSave}
        onDelete={handleDeleteFromModal}
        onViewLogs={editingContact ? () => { setModalOpen(false); setLogPanelOpen(true) } : undefined}
      />

      {/* Meeting log panel */}
      <MeetingLogPanel
        contact={editingContact}
        open={logPanelOpen}
        onOpenChange={setLogPanelOpen}
        today={today}
        onUpdateContact={editContact}
      />

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>연락처 일괄 삭제</DialogTitle>
            <DialogDescription>
              선택한 <strong>{selectedIds.size}건</strong>의 연락처를 삭제하시겠습니까?{" "}
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={deletingBulk}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={deletingBulk}
            >
              {deletingBulk ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
