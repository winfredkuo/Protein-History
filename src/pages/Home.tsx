import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, subDays, isToday } from "date-fns";
import { ChevronRight, Plus, Info } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";

const COMMON_FOODS = [
  { name: "鮭魚 (100g)", protein: 22 },
  { name: "牛肉 (100g)", protein: 20 },
  { name: "豬肉 (100g)", protein: 20 },
  { name: "雞肉 (100g)", protein: 21 },
  { name: "魚肉 (100g)", protein: 15 },
  { name: "蝦仁 (100g)", protein: 10 },
  { name: "雞蛋 (1顆)", protein: 7 },
  { name: "麥當勞豬肉蛋堡", protein: 21 },
  { name: "麥當勞大麥克", protein: 26 },
  { name: "麥當勞雙層四盎司", protein: 52 },
  { name: "麥當勞四盎司", protein: 32 },
  { name: "麥當勞雙層牛肉吉事堡", protein: 26 },
  { name: "豆漿 (100cc)", protein: 3.5 },
  { name: "蚵仔 (100g)", protein: 10 },
];

export default function HomePage() {
  const { profile, records, addFoodEntry } = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  
  const [manualName, setManualName] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [showReference, setShowReference] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecord = records[todayStr] || { totalProtein: 0 };
  const progress = Math.min(
    (todayRecord.totalProtein / profile.dailyGoal) * 100,
    100,
  );

  const recentDays = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      date,
      dateStr,
      record: records[dateStr] || { totalProtein: 0 },
    };
  });

  const handleManualAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualProtein.trim()) return;

    const proteinNum = parseFloat(manualProtein);
    if (isNaN(proteinNum)) {
      setError("請輸入有效的蛋白質數值");
      return;
    }

    addFoodEntry(todayStr, {
      id: uuidv4(),
      name: manualName.trim(),
      protein: proteinNum,
      timestamp: Date.now(),
    });
    
    setManualName("");
    setManualProtein("");
    setError("");
    navigate(`/day/${todayStr}`);
  };

  const handleQuickAdd = (food: typeof COMMON_FOODS[0]) => {
    setManualName(food.name);
    setManualProtein(food.protein.toString());
    setShowReference(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header / Today's Progress */}
      <div className="bg-white px-6 py-8 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          今日攝取量
        </h1>

        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-4xl font-black text-indigo-600 tracking-tight">
              {todayRecord.totalProtein}
            </span>
            <span className="text-slate-500 ml-1 font-medium">
              / {profile.dailyGoal}克
            </span>
          </div>
          <div className="text-sm font-medium text-slate-500 mb-1">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Progress Bar */}
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

      {/* Quick Add Section */}
      <div className="px-6 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            新增食物
          </h2>
          <button 
            onClick={() => setShowReference(!showReference)}
            className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            常見食物參考
          </button>
        </div>

        {showReference && (
          <div className="mb-6 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto">
            {COMMON_FOODS.map((food) => (
              <button
                key={food.name}
                onClick={() => handleQuickAdd(food)}
                className="text-left p-2.5 bg-white border border-slate-200 rounded-xl text-xs hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <div className="font-bold text-slate-700 group-hover:text-indigo-700">{food.name}</div>
                <div className="text-slate-400 mt-0.5">{food.protein}克 蛋白質</div>
              </button>
            ))}
          </div>
        )}

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

      {/* History */}
      <div className="flex-1 px-6 py-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
          近期紀錄
        </h2>
        <div className="space-y-3">
          {recentDays.map(({ date, dateStr, record }) => {
            const dayProgress = Math.min(
              (record.totalProtein / profile.dailyGoal) * 100,
              100,
            );
            const isGoalMet = record.totalProtein >= profile.dailyGoal;

            return (
              <Link
                key={dateStr}
                to={`/day/${dateStr}`}
                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors group"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {isToday(date) ? "今天" : format(date, "MMM d日, EEEE")}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {record.totalProtein}克 蛋白質
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-50 flex items-center justify-center relative">
                    <svg
                      className="w-full h-full transform -rotate-90 absolute"
                      viewBox="0 0 36 36"
                    >
                      <path
                        className="text-slate-100"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={
                          isGoalMet ? "text-emerald-500" : "text-indigo-600"
                        }
                        strokeDasharray={`${dayProgress}, 100`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
