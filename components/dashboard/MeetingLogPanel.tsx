"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMeetingLogs } from "@/hooks/useMeetingLogs"
import type { Contact, ContactUpdate, MeetingLog } from "@/lib/types"
import { ArrowLeft, Plus, Pencil } from "lucide-react"

interface MeetingLogPanelProps {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  today: string
  onUpdateContact: (id: string, data: ContactUpdate) => Promise<unknown>
}

function importanceBadgeClass(importance: string | null) {
  if (importance === "상") return "bg-red-100 text-red-700 border-red-200"
  if (importance === "중") return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-zinc-100 text-zinc-600 border-zinc-200"
}

function maxDate(dates: (string | null)[]): string | null {
  const valid = dates.filter(Boolean) as string[]
  return valid.length > 0 ? valid.sort().at(-1)! : null
}

export function MeetingLogPanel({ contact, open, onOpenChange, today, onUpdateContact }: MeetingLogPanelProps) {
  const { logs, loading, addLog, editLog, removeLog } = useMeetingLogs(contact?.id ?? "")

  const [view, setView] = useState<"list" | "form">("list")
  const [editingLog, setEditingLog] = useState<MeetingLog | null>(null)
  const [formDate, setFormDate] = useState(today)
  const [formContents, setFormContents] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 패널이 열리거나 대상 연락처가 바뀔 때 목록 뷰로 초기화
  useEffect(() => {
    if (!open) return
    setView("list")
    setEditingLog(null)
    setShowDeleteConfirm(false)
  }, [open, contact?.id])

  const openNewForm = () => {
    setEditingLog(null)
    setFormDate(today)
    setFormContents("")
    setShowDeleteConfirm(false)
    setView("form")
  }

  const openEditForm = (log: MeetingLog) => {
    setEditingLog(log)
    setFormDate(log.meeting_date)
    setFormContents(log.contents ?? "")
    setShowDeleteConfirm(false)
    setView("form")
  }

  const backToList = () => {
    setView("list")
    setShowDeleteConfirm(false)
  }

  const handleSave = async () => {
    if (!contact || !formDate) return
    setSaving(true)
    try {
      let updatedLogs: MeetingLog[]
      if (editingLog) {
        const updated = await editLog(editingLog.id, {
          meeting_date: formDate,
          contents: formContents || null,
        })
        updatedLogs = logs.map((l) => (l.id === editingLog.id ? updated : l))
      } else {
        const newLog = await addLog({
          contact_id: contact.id,
          meeting_date: formDate,
          contents: formContents || null,
        })
        updatedLogs = [...logs, newLog]
      }

      // 전체 로그 중 가장 최신 날짜를 최근컨택일에 반영
      const latest = maxDate(updatedLogs.map((l) => l.meeting_date))
      if (latest && latest !== contact.last_contact_date) {
        await onUpdateContact(contact.id, { last_contact_date: latest })
      }

      backToList()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingLog || !contact) return
    setSaving(true)
    try {
      await removeLog(editingLog.id)

      // 삭제 후 남은 로그 중 가장 최신 날짜로 갱신
      const remainingLogs = logs.filter((l) => l.id !== editingLog.id)
      const latest = maxDate(remainingLogs.map((l) => l.meeting_date))
      if (latest !== contact.last_contact_date) {
        await onUpdateContact(contact.id, { last_contact_date: latest })
      }

      backToList()
    } finally {
      setSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!contact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {view === "form"
              ? editingLog
                ? "미팅 로그 수정"
                : "새 미팅 로그"
              : "미팅 로그"}
          </DialogTitle>
        </DialogHeader>

        {/* ─── 목록 뷰 ─────────────────────────────────────────── */}
        {view === "list" && (
          <div className="flex flex-col gap-4 min-h-0">
            {/* 연락처 기본 정보 요약 */}
            <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base">{contact.name}</span>
                {contact.company && (
                  <span className="text-sm text-muted-foreground">{contact.company}</span>
                )}
                {contact.position && (
                  <span className="text-sm text-muted-foreground">· {contact.position}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {contact.group_tag && (
                  <Badge variant="outline" className="text-xs">{contact.group_tag}</Badge>
                )}
                {contact.importance && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${importanceBadgeClass(contact.importance)}`}
                  >
                    {contact.importance}
                  </Badge>
                )}
                {contact.interest && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    관심
                  </Badge>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground pt-0.5">
                {contact.last_contact_date && (
                  <span>최근 컨택: {contact.last_contact_date}</span>
                )}
                {contact.contact_cycle && (
                  <span>연락 주기: {contact.contact_cycle}일</span>
                )}
              </div>
            </div>

            {/* 새 미팅 로그 버튼 */}
            <Button size="sm" onClick={openNewForm} className="w-fit">
              <Plus className="h-4 w-4 mr-1" />
              새 미팅 로그
            </Button>

            <Separator />

            {/* 미팅 로그 목록 */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  불러오는 중...
                </p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  미팅 로그가 없습니다.
                </p>
              ) : (
                logs.map((log) => (
                  <button
                    key={log.id}
                    className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors group"
                    onClick={() => openEditForm(log)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{log.meeting_date}</span>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {log.contents ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {log.contents}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">내용 없음</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── 입력/수정 뷰 ────────────────────────────────────── */}
        {view === "form" && (
          <div className="flex flex-col gap-4">
            {/* 뒤로 가기 */}
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-1 text-muted-foreground"
              onClick={backToList}
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              목록으로
            </Button>

            {/* 미팅 날짜 */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-date">미팅 날짜</Label>
              <Input
                id="meeting-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* 내용 */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-contents">내용</Label>
              <textarea
                id="meeting-contents"
                className="w-full min-h-[160px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="미팅 내용을 입력하세요"
                value={formContents}
                onChange={(e) => setFormContents(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-center gap-2 pt-1">
              {/* 삭제 (수정 모드만) */}
              {editingLog && !showDeleteConfirm && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mr-auto"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                >
                  삭제
                </Button>
              )}
              {editingLog && showDeleteConfirm && (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm text-destructive font-medium">삭제할까요?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? "삭제 중..." : "확인"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                  >
                    취소
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={backToList}
                disabled={saving}
                className="ml-auto"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !formDate}
              >
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
