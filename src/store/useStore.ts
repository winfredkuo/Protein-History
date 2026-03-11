import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

export type UserProfile = {
  weight: number; // kg
  goalMultiplier: number; // g per kg (e.g., 1.6 - 2.2)
  dailyGoal: number; // calculated
};

export type FoodEntry = {
  id: string;
  name: string;
  protein: number; // grams
  timestamp: number;
};

export type DailyRecord = {
  date: string; // YYYY-MM-DD
  entries: FoodEntry[];
  totalProtein: number;
};

export type InBodyRecord = {
  id: string;
  timestamp: number;
  weight: number;
  muscleMass: number;
  bodyFat: number;
  recommendedMultiplier: number;
  recommendedProtein: number;
};

const DEFAULT_PROFILE: UserProfile = {
  weight: 70,
  goalMultiplier: 1.8,
  dailyGoal: Math.round(70 * 1.8),
};

export function useStore() {
  const [userId, setUserIdState] = useState<string | null>(() => {
    return localStorage.getItem("proteinTracker_userId");
  });

  const [profile, setProfileState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("proteinTracker_profile");
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [records, setRecordsState] = useState<Record<string, DailyRecord>>(
    () => {
      const saved = localStorage.getItem("proteinTracker_records");
      return saved ? JSON.parse(saved) : {};
    },
  );

  const [inBodyRecords, setInBodyRecordsState] = useState<InBodyRecord[]>(() => {
    const saved = localStorage.getItem("proteinTracker_inbody");
    return saved ? JSON.parse(saved) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with server (Download)
  const syncWithServer = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/data/${id}`);
      if (response.ok) {
        const data = await response.json();
        // Only update if server has data
        if (data.profile) {
          setProfileState(data.profile);
          setRecordsState(data.records || {});
          setInBodyRecordsState(data.inBodyRecords || []);
          setUserIdState(id);
          localStorage.setItem("proteinTracker_userId", id);
          return true;
        } else {
          // If server is empty, we treat this as "registering" this ID with current local data
          setUserIdState(id);
          localStorage.setItem("proteinTracker_userId", id);
          return true;
        }
      }
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
    return false;
  }, []);

  const uploadToServer = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch(`/api/data/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, records, inBodyRecords }),
      });
    } catch (error) {
      console.error("Upload failed", error);
    }
  }, [userId, profile, records, inBodyRecords]);

  const logout = useCallback(() => {
    setUserIdState(null);
    localStorage.removeItem("proteinTracker_userId");
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem("proteinTracker_profile", JSON.stringify(profile));
    if (userId) {
      uploadToServer();
    }
  }, [profile, userId, records, inBodyRecords, uploadToServer]);

  useEffect(() => {
    localStorage.setItem("proteinTracker_records", JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem("proteinTracker_inbody", JSON.stringify(inBodyRecords));
  }, [inBodyRecords]);

  const updateProfile = useCallback((newProfile: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const updated = { ...prev, ...newProfile };
      updated.dailyGoal = Math.round(updated.weight * updated.goalMultiplier);
      return updated;
    });
  }, []);

  const addFoodEntry = useCallback((date: string, entry: FoodEntry) => {
    setRecordsState((prev) => {
      const dayRecord = prev[date] || { date, entries: [], totalProtein: 0 };
      const newEntries = [...dayRecord.entries, entry];
      const newTotal = newEntries.reduce((sum, e) => sum + e.protein, 0);
      return {
        ...prev,
        [date]: { ...dayRecord, entries: newEntries, totalProtein: newTotal },
      };
    });
  }, []);

  const updateFoodEntry = useCallback(
    (date: string, entryId: string, updatedEntry: Partial<FoodEntry>) => {
      setRecordsState((prev) => {
        const dayRecord = prev[date];
        if (!dayRecord) return prev;

        const newEntries = dayRecord.entries.map((e) =>
          e.id === entryId ? { ...e, ...updatedEntry } : e,
        );
        const newTotal = newEntries.reduce((sum, e) => sum + e.protein, 0);

        return {
          ...prev,
          [date]: { ...dayRecord, entries: newEntries, totalProtein: newTotal },
        };
      });
    },
    [],
  );

  const removeFoodEntry = useCallback((date: string, entryId: string) => {
    setRecordsState((prev) => {
      const dayRecord = prev[date];
      if (!dayRecord) return prev;

      const newEntries = dayRecord.entries.filter((e) => e.id !== entryId);
      const newTotal = newEntries.reduce((sum, e) => sum + e.protein, 0);

      return {
        ...prev,
        [date]: { ...dayRecord, entries: newEntries, totalProtein: newTotal },
      };
    });
  }, []);

  const getRecordForDate = useCallback(
    (date: string): DailyRecord => {
      return records[date] || { date, entries: [], totalProtein: 0 };
    },
    [records],
  );

  const addInBodyRecord = useCallback((record: InBodyRecord) => {
    setInBodyRecordsState((prev) => {
      const newRecords = [record, ...prev];
      // Sort by timestamp descending
      return newRecords.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  const removeInBodyRecord = useCallback((id: string) => {
    setInBodyRecordsState((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const importData = useCallback((data: { profile: UserProfile, records: Record<string, DailyRecord>, inBodyRecords?: InBodyRecord[] }) => {
    if (data.profile) setProfileState(data.profile);
    if (data.records) setRecordsState(data.records);
    if (data.inBodyRecords) setInBodyRecordsState(data.inBodyRecords);
  }, []);

  return {
    profile,
    updateProfile,
    records,
    addFoodEntry,
    updateFoodEntry,
    removeFoodEntry,
    getRecordForDate,
    inBodyRecords,
    addInBodyRecord,
    removeInBodyRecord,
    importData,
    userId,
    syncWithServer,
    logout,
    isSyncing,
  };
}
