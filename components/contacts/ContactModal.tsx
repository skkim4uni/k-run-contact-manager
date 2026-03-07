"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ClipboardList } from "lucide-react"
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/types"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  onSave: (data: ContactInsert | ContactUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onViewLogs?: () => void
}

const EMPTY_FORM = {
  name: "",
  company: "",
  department: "",
  position: "",
  email: "",
  phone: "",
  group_tag: "",
  importance: "",
  interest: false,
  excluded: false,
  contact_cycle: "",
  last_contact_date: "",
  memo: "",
  created_at: "",
}

export function ContactModal({ open, onOpenChange, contact, onSave, onDelete, onViewLogs }: ContactModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    if (contact) {
      setForm({
        name: contact.name ?? "",
        company: contact.company ?? "",
        department: contact.department ?? "",
        position: contact.position ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        group_tag: contact.group_tag ?? "",
        importance: contact.importance ?? "",
        interest: contact.interest ?? false,
        excluded: contact.excluded ?? false,
        contact_cycle: contact.contact_cycle != null ? String(contact.contact_cycle) : "",
        last_contact_date: contact.last_contact_date ?? "",
        memo: contact.memo ?? "",
        created_at: contact.created_at ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setShowDeleteConfirm(false)
  }, [open, contact])

  const set = (field: keyof typeof EMPTY_FORM) =>
    (value: string | boolean) => setForm((p) => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const data: ContactInsert = {
        name: form.name.trim(),
        company: form.company || null,
        department: form.department || null,
        position: form.position || null,
        email: form.email || null,
        phone: form.phone || null,
        group_tag: (form.group_tag as ContactInsert["group_tag"]) || null,
        importance: (form.importance as ContactInsert["importance"]) || null,
        interest: form.interest,
        excluded: form.excluded,
        contact_cycle: form.contact_cycle ? parseInt(form.contact_cycle) : null,
        last_contact_date: contact?.last_contact_date ?? null, // 수동 수정 불가, 기존 값 유지
        memo: form.memo || null,
        created_at: form.created_at || null,
      }
      await onSave(data)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!contact) return
    setSaving(true)
    try {
      await onDelete(contact.id)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "연락처 수정" : "새 연락처 추가"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* 이름 */}
          <div className="space-y-1">
            <Label htmlFor="name">
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="이름"
            />
          </div>

          {/* 회사 */}
          <div className="space-y-1">
            <Label htmlFor="company">회사</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => set("company")(e.target.value)}
              placeholder="회사"
            />
          </div>

          {/* 부서 */}
          <div className="space-y-1">
            <Label htmlFor="department">부서</Label>
            <Input
              id="department"
              value={form.department}
              onChange={(e) => set("department")(e.target.value)}
              placeholder="부서"
            />
          </div>

          {/* 직급 */}
          <div className="space-y-1">
            <Label htmlFor="position">직급</Label>
            <Input
              id="position"
              value={form.position}
              onChange={(e) => set("position")(e.target.value)}
              placeholder="직급"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="이메일"
            />
          </div>

          {/* 전화번호 */}
          <div className="space-y-1">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              placeholder="전화번호"
            />
          </div>

          {/* 그룹 */}
          <div className="space-y-1">
            <Label>그룹</Label>
            <Select
              value={form.group_tag || "_none"}
              onValueChange={(v) => set("group_tag")(v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="그룹 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">없음</SelectItem>
                <SelectItem value="투자업계">투자업계</SelectItem>
                <SelectItem value="LP">LP</SelectItem>
                <SelectItem value="개인">개인</SelectItem>
                <SelectItem value="기타">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 중요도 */}
          <div className="space-y-1">
            <Label>중요도</Label>
            <Select
              value={form.importance || "_none"}
              onValueChange={(v) => set("importance")(v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="중요도 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">없음</SelectItem>
                <SelectItem value="상">상</SelectItem>
                <SelectItem value="중">중</SelectItem>
                <SelectItem value="하">하</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 연락 주기 */}
          <div className="space-y-1">
            <Label htmlFor="contact_cycle">연락 주기 (일)</Label>
            <Input
              id="contact_cycle"
              type="number"
              min={1}
              value={form.contact_cycle}
              onChange={(e) => set("contact_cycle")(e.target.value)}
              placeholder="예: 30"
            />
          </div>

          {/* 최근 컨택일 (읽기 전용 — 미팅 로그에서 자동 반영) */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">최근 컨택일</Label>
            <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm text-muted-foreground select-none">
              {form.last_contact_date || "—"}
            </div>
            <p className="text-xs text-muted-foreground">미팅 로그에서 자동 반영됩니다</p>
          </div>

          {/* 최초 등록일 */}
          <div className="space-y-1">
            <Label htmlFor="created_at">최초 등록일</Label>
            <Input
              id="created_at"
              type="date"
              value={form.created_at}
              onChange={(e) => set("created_at")(e.target.value)}
            />
          </div>

          {/* 관심여부 / 대상제외 */}
          <div className="flex items-center gap-6 pt-5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="interest"
                checked={form.interest}
                onCheckedChange={(v) => set("interest")(Boolean(v))}
              />
              <Label htmlFor="interest" className="cursor-pointer font-normal">
                관심 여부
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="excluded"
                checked={form.excluded}
                onCheckedChange={(v) => set("excluded")(Boolean(v))}
              />
              <Label htmlFor="excluded" className="cursor-pointer font-normal">
                대상 제외
              </Label>
            </div>
          </div>

          {/* 메모 */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="memo">메모</Label>
            <textarea
              id="memo"
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              value={form.memo}
              onChange={(e) => set("memo")(e.target.value)}
              placeholder="메모를 입력하세요"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          {contact && !showDeleteConfirm && (
            <div className="flex items-center gap-2 sm:mr-auto">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
              >
                삭제
              </Button>
              {onViewLogs && (
                <Button
                  variant="outline"
                  onClick={onViewLogs}
                  disabled={saving}
                >
                  <ClipboardList className="h-4 w-4 mr-1" />
                  미팅 로그 보기
                </Button>
              )}
            </div>
          )}
          {contact && showDeleteConfirm && (
            <div className="flex items-center gap-2 sm:mr-auto">
              <span className="text-sm text-destructive font-medium">
                정말 삭제하시겠습니까?
              </span>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
