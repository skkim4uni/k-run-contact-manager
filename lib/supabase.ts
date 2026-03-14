import { createClient } from "@supabase/supabase-js";
import type { Contact, ContactInsert, ContactUpdate, MeetingLog, MeetingLogInsert, MeetingLogUpdate, MeetingLogWithContact } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Contacts CRUD ───────────────────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getContacts 오류:", error);
    throw error;
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("getContactById 오류:", error);
    throw error;
  }
}

export async function createContact(contact: ContactInsert): Promise<Contact> {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .insert(contact)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("createContact 오류:", error);
    throw error;
  }
}

export async function updateContact(id: string, contact: ContactUpdate): Promise<Contact> {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .update({ ...contact, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("updateContact 오류:", error);
    throw error;
  }
}

export async function deleteContact(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("deleteContact 오류:", error);
    throw error;
  }
}

// ─── Meeting Logs CRUD ────────────────────────────────────────────────────────

export async function getMeetingLogsByContactId(contactId: string): Promise<MeetingLog[]> {
  try {
    const { data, error } = await supabase
      .from("meeting_logs")
      .select("*")
      .eq("contact_id", contactId)
      .order("meeting_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getMeetingLogsByContactId 오류:", error);
    throw error;
  }
}

export async function createMeetingLog(log: MeetingLogInsert): Promise<MeetingLog> {
  try {
    const { data, error } = await supabase
      .from("meeting_logs")
      .insert(log)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("createMeetingLog 오류:", error);
    throw error;
  }
}

export async function updateMeetingLog(id: string, log: MeetingLogUpdate): Promise<MeetingLog> {
  try {
    const { data, error } = await supabase
      .from("meeting_logs")
      .update({ ...log, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("updateMeetingLog 오류:", error);
    throw error;
  }
}

export async function deleteMeetingLog(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("meeting_logs")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("deleteMeetingLog 오류:", error);
    throw error;
  }
}

export async function getAllMeetingLogs(): Promise<MeetingLogWithContact[]> {
  try {
    const { data, error } = await supabase
      .from("meeting_logs")
      .select("*, contacts(*)")
      .order("meeting_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MeetingLogWithContact[];
  } catch (error) {
    console.error("getAllMeetingLogs 오류:", error);
    throw error;
  }
}
