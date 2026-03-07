"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/types";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from "@/lib/supabase";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      setError("연락처 목록을 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = async (contact: ContactInsert): Promise<Contact> => {
    const newContact = await createContact(contact);
    setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    return newContact;
  };

  const editContact = async (id: string, contact: ContactUpdate): Promise<Contact> => {
    const updated = await updateContact(id, contact);
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const removeContact = async (id: string): Promise<void> => {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    addContact,
    editContact,
    removeContact,
  };
}

export function useContact(id: string) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContactById(id);
      setContact(data);
    } catch (err) {
      setError("연락처를 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchContact();
  }, [id, fetchContact]);

  const editContact = async (contact: ContactUpdate): Promise<void> => {
    const updated = await updateContact(id, contact);
    setContact(updated);
  };

  return {
    contact,
    loading,
    error,
    refetch: fetchContact,
    editContact,
  };
}
