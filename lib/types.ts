export type GroupTag = "투자업계" | "LP" | "개인" | "기타";
export type Importance = "상" | "중" | "하";

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  group_tag: GroupTag | null;
  importance: Importance | null;
  interest: boolean | null;
  excluded: boolean | null;
  contact_cycle: number | null;
  last_contact_date: string | null;
  memo: string | null;
  created_at: string | null;
  inserted_at: string | null;
  updated_at: string | null;
}

export type ContactInsert = Omit<Contact, "id" | "inserted_at" | "updated_at">;
export type ContactUpdate = Partial<Omit<Contact, "id" | "inserted_at" | "updated_at">>;

export interface MeetingLog {
  id: string;
  contact_id: string;
  meeting_date: string;
  contents: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type MeetingLogInsert = Omit<MeetingLog, "id" | "created_at" | "updated_at">;
export type MeetingLogUpdate = Partial<Omit<MeetingLog, "id" | "contact_id" | "created_at" | "updated_at">>;

export interface MeetingLogWithContact extends MeetingLog {
  contacts: Contact;
}
