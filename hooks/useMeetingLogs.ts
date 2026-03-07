"use client";

import { useState, useEffect, useCallback } from "react";
import type { MeetingLog, MeetingLogInsert, MeetingLogUpdate } from "@/lib/types";
import {
  getMeetingLogsByContactId,
  createMeetingLog,
  updateMeetingLog,
  deleteMeetingLog,
} from "@/lib/supabase";

export function useMeetingLogs(contactId: string) {
  const [logs, setLogs] = useState<MeetingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMeetingLogsByContactId(contactId);
      setLogs(data);
    } catch (err) {
      setError("미팅 로그를 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (contactId) fetchLogs();
  }, [contactId, fetchLogs]);

  const addLog = async (log: MeetingLogInsert): Promise<MeetingLog> => {
    const newLog = await createMeetingLog(log);
    setLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const editLog = async (id: string, log: MeetingLogUpdate): Promise<MeetingLog> => {
    const updated = await updateMeetingLog(id, log);
    setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  };

  const removeLog = async (id: string): Promise<void> => {
    await deleteMeetingLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    addLog,
    editLog,
    removeLog,
  };
}
