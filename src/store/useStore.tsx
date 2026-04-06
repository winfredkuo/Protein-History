import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { format } from "date-fns";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
  photoUrl?: string;
};

const DEFAULT_PROFILE: UserProfile = {
  weight: 70,
  goalMultiplier: 1.8,
  dailyGoal: Math.round(70 * 1.8),
};

interface StoreContextType {
  profile: UserProfile;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  records: Record<string, DailyRecord>;
  addFoodEntry: (date: string, entry: FoodEntry) => void;
  updateFoodEntry: (date: string, entryId: string, updatedEntry: Partial<FoodEntry>) => void;
  removeFoodEntry: (date: string, entryId: string) => void;
  getRecordForDate: (date: string) => DailyRecord;
  inBodyRecords: InBodyRecord[];
  addInBodyRecord: (record: InBodyRecord) => void;
  removeInBodyRecord: (id: string) => void;
  importData: (data: { profile: UserProfile, records: Record<string, DailyRecord>, inBodyRecords?: InBodyRecord[] }) => void;
  userId: string | null;
  user: FirebaseUser | null;
  syncWithServer: (id: string) => Promise<boolean>;
  logout: () => void;
  isSyncing: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
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
    if (!db) return false;
    setIsSyncing(true);
    try {
      const docRef = doc(db, "users", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile) {
          setProfileState(data.profile);
          setRecordsState(data.records || {});
          setInBodyRecordsState(data.inBodyRecords || []);
          setUserIdState(id);
          localStorage.setItem("proteinTracker_userId", id);
          return true;
        }
      }
      
      // If server is empty, we treat this as "registering" this ID with current local data
      setUserIdState(id);
      localStorage.setItem("proteinTracker_userId", id);
      
      // Force an immediate upload of local data to the new server document
      const localProfile = JSON.parse(localStorage.getItem("proteinTracker_profile") || JSON.stringify(DEFAULT_PROFILE));
      const localRecords = JSON.parse(localStorage.getItem("proteinTracker_records") || "{}");
      const localInBody = JSON.parse(localStorage.getItem("proteinTracker_inbody") || "[]");
      
      await setDoc(docRef, {
        profile: localProfile,
        records: localRecords,
        inBodyRecords: localInBody,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
    return false;
  }, []);

  // Listen for auth changes
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserIdState(firebaseUser.uid);
        localStorage.setItem("proteinTracker_userId", firebaseUser.uid);
        syncWithServer(firebaseUser.uid);
      } else {
        setUser(null);
        setUserIdState(null);
        localStorage.removeItem("proteinTracker_userId");
      }
    });
    return () => unsubscribe();
  }, [syncWithServer]);

  const uploadToServer = useCallback(async () => {
    if (!userId || !db) return;
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, {
        profile,
        records,
        inBodyRecords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
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
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("proteinTracker_records", JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem("proteinTracker_inbody", JSON.stringify(inBodyRecords));
  }, [inBodyRecords]);

  // Upload to server whenever data changes, but debounce it
  useEffect(() => {
    if (!userId || isSyncing) return;
    
    const timeoutId = setTimeout(() => {
      uploadToServer();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [profile, records, inBodyRecords, userId, uploadToServer, isSyncing]);

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

  const value = {
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
    user,
    syncWithServer,
    logout,
    isSyncing,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
