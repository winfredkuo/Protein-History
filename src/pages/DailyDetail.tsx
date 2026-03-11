import { useState, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, isToday } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useStore, FoodEntry } from "../store/useStore";
import { cn } from "../lib/utils";

export default function DailyDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const {
    profile,
    getRecordForDate,
    addFoodEntry,
    removeFoodEntry,
    updateFoodEntry,
  } = useStore();

  const [error, setError] = useState("");
  
  const [manualName, setManualName] = useState("");
  const [manualProtein, setManualProtein] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editProtein, setEditProtein] = useState("");

  if (!date) return null;

  const record = getRecordForDate(date);
  const parsedDate = parseISO(date);
  const dateDisplay = isToday(parsedDate)
    ? "今天"
    : format(parsedDate, "yyyy年MM月dd日");
  const progress = Math.min(
    (record.totalProtein / profile.dailyGoal) * 100,
    100,
  );

  const handleManualAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualProtein.trim()) return;

    const proteinNum = parseFloat(manualProtein);
    if (isNaN(proteinNum)) {
      setError("請輸入有效的蛋白質數值");
      return;
    }

    addFoodEntry(date, {
      id: uuidv4(),
      name: manualName.trim(),
      protein: proteinNum,
      timestamp: Date.now(),
    });
    
    setManualName("");
    setManualProtein("");
    setError("");
  };

  const startEdit = (entry: FoodEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditProtein(entry.protein.toString());
  };

  const saveEdit = (id: string) => {
    const proteinNum = parseFloat(editProtein);
    if (!isNaN(proteinNum) && editName.trim()) {
      updateFoodEntry(date, id, { name: editName.trim(), protein: proteinNum });
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10 flex items-center">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 mr-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{dateDisplay}</h1>
      </div>

      {/* Summary Card */}
      <div className="px-6 py-6 bg-white border-b border-slate-200">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-4xl font-black text-indigo-600 tracking-tight">
              {record.totalProtein}
            </span>
            <span className="text-slate-500 ml-1 font-medium">
              / {profile.dailyGoal}克
            </span>
          </div>
          <div className="text-sm font-medium text-slate-500 mb-1">
            {Math.round(progress)}%
          </div>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              progress >= 100 ? "bg-emerald-500" : "bg-indigo-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add Food Section */}
      <div className="px-6 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            新增食物
          </h2>
        </div>

        <form onSubmit={handleManualAdd} className="flex flex-col space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="食物名稱 (例如：雞胸肉)"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <div className="relative w-28">
              <input
                type="number"
                step="0.1"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                placeholder="蛋白質"
                className="w-full pl-3 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <span className="absolute right-3 top-3.5 text-slate-400 text-sm">克</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!manualName.trim() || !manualProtein.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增紀錄
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Food List */}
      <div className="flex-1 px-6 py-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
          飲食紀錄
        </h2>

        {record.entries.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">尚未記錄任何食物。</p>
            <p className="text-sm text-slate-400 mt-1">
              使用上方的輸入框來新增您的第一餐。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {record.entries
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group"
                >
                  {editingId === entry.id ? (
                    <div className="flex-1 flex items-center space-x-2 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editProtein}
                          onChange={(e) => setEditProtein(e.target.value)}
                          className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-500 text-sm">克</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {entry.name}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {format(entry.timestamp, "h:mm a")}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    {editingId === entry.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(entry.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-indigo-600 mr-2">
                          {entry.protein}g
                        </div>
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFoodEntry(date, entry.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
