"use client"

import { useState, useMemo } from "react"
import { useContacts } from "@/hooks/useContacts"
import { ContactModal } from "@/components/contacts/ContactModal"
import { MeetingLogPanel } from "@/components/dashboard/MeetingLogPanel"
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, Plus, ClipboardList } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function importanceBadgeClass(importance: string | null) {
  if (importance === "상") return "bg-red-100 text-red-700 border-red-200"
  if (importance === "중") return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-zinc-100 text-zinc-600 border-zinc-200"
}

const GROUP_TAGS = ["투자업계", "LP", "개인", "기타"] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileContacts() {
  const { contacts, loading, addContact, editContact, removeContact } = useContacts()
  const today = useMemo(getToday, [])

  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState("all")
  const [filterImportance, setFilterImportance] = useState("all")

  // Contact modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // Meeting log panel
  const [logPanelContact, setLogPanelContact] = useState<Contact | null>(null)
  const [logPanelOpen, setLogPanelOpen] = useState(false)

  const filtered = useMemo(() => {
    let result = contacts
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.company?.toLowerCase() ?? "").includes(s) ||
          (c.position?.toLowerCase() ?? "").includes(s)
      )
    }
    if (filterGroup !== "all") result = result.filter((c) => c.group_tag === filterGroup)
    if (filterImportance !== "all") result = result.filter((c) => c.importance === filterImportance)
    return result
  }, [contacts, search, filterGroup, filterImportance])

  const openNew = () => {
    setEditingContact(null)
    setModalOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    setModalOpen(true)
  }

  const openLogs = (contact: Contact) => {
    setLogPanelContact(contact)
    setLogPanelOpen(true)
  }

  const handleSave = async (data: ContactInsert | ContactUpdate) => {
    if (editingContact) {
      await editContact(editingContact.id, data as ContactUpdate)
    } else {
      await addContact(data as ContactInsert)
    }
  }

  const handleDelete = async (id: string) => {
    await removeContact(id)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search + Add */}
      <div className="px-4 py-3 border-b flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 회사, 직급 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button size="sm" className="h-9 shrink-0" onClick={openNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b flex gap-2">
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

      {/* Count */}
      <div className="px-4 py-1.5 text-xs text-muted-foreground border-b">
        {loading ? "불러오는 중..." : `${filtered.length}명`}
        {filtered.length !== contacts.length && ` / 전체 ${contacts.length}명`}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-muted-foreground py-16 text-sm">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">연락처가 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((contact) => (
              <li key={contact.id} className="px-4 py-3.5">
                <div className="flex items-start gap-2">
                  {/* Main info — tap to edit */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => openEdit(contact)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{contact.name}</span>
                      {contact.excluded && (
                        <span className="text-xs text-muted-foreground">(대상제외)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 space-x-1">
                      {contact.company && <span>{contact.company}</span>}
                      {contact.company && contact.position && <span>·</span>}
                      {contact.position && <span>{contact.position}</span>}
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
                    </div>
                    {contact.last_contact_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        최근 컨택: {contact.last_contact_date}
                      </p>
                    )}
                  </button>

                  {/* Meeting log button */}
                  <button
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => openLogs(contact)}
                    title="미팅 로그"
                  >
                    <ClipboardList className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contact modal */}
      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contact={editingContact}
        onSave={handleSave}
        onDelete={handleDelete}
        onViewLogs={
          editingContact
            ? () => {
                setModalOpen(false)
                openLogs(editingContact)
              }
            : undefined
        }
      />

      {/* Meeting log panel */}
      <MeetingLogPanel
        contact={logPanelContact}
        open={logPanelOpen}
        onOpenChange={setLogPanelOpen}
        today={today}
        onUpdateContact={editContact}
      />
    </div>
  )
}
