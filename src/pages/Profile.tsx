import { useState, FormEvent, useRef, ChangeEvent } from "react";
import { useStore } from "../store/useStore";
import { Save, User, Target, Download, Upload, Database, Activity, Trash2, Cloud, LogOut, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
  const { profile, updateProfile, records, inBodyRecords, addInBodyRecord, removeInBodyRecord, importData, userId, syncWithServer, logout, isSyncing } = useStore();

  const [weight, setWeight] = useState(profile.weight.toString());
  const [goalMultiplier, setGoalMultiplier] = useState(
    profile.goalMultiplier.toString(),
  );
  const [isSaved, setIsSaved] = useState(false);
  const [syncIdInput, setSyncIdInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight);
    const m = parseFloat(goalMultiplier);

    if (!isNaN(w) && !isNaN(m)) {
      updateProfile({ weight: w, goalMultiplier: m });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleExport = () => {
    const dataToExport = { profile, records, inBodyRecords };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `protein-tracker-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.profile && data.records) {
          importData(data);
          setWeight(data.profile.weight.toString());
          setGoalMultiplier(data.profile.goalMultiplier.toString());
          alert("資料匯入成功！");
        } else {
          alert("無效的備份檔案格式");
        }
      } catch (err) {
        alert("讀取檔案失敗");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSync = async (e: FormEvent) => {
    e.preventDefault();
    if (syncIdInput.trim()) {
      await syncWithServer(syncIdInput.trim());
      setSyncIdInput("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-8 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          個人資料與目標
        </h1>
        <p className="text-slate-500 text-sm">
          設定您的個人資料以計算每日蛋白質需求。
        </p>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* Cloud Sync Section */}
        <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center mb-4">
            <Cloud className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-bold">雲端同步</h2>
          </div>
          
          {userId ? (
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                <p className="text-xs text-indigo-100 uppercase tracking-wider mb-1">目前同步 ID</p>
                <p className="text-xl font-mono font-bold">{userId}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <p className="text-xs text-indigo-100 leading-relaxed">
                  ✅ 您的資料已與雲端同步。<br />
                  📱 在手機或其他瀏覽器輸入此 ID 即可找回紀錄。
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                登出同步
              </button>
            </div>
          ) : (
            <form onSubmit={handleSync} className="space-y-4">
              <p className="text-sm text-indigo-100">
                請輸入一個「同步 ID」（例如您的 Email 或手機），即可在不同裝置同步。
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={syncIdInput}
                  onChange={(e) => setSyncIdInput(e.target.value)}
                  placeholder="輸入您的同步 ID"
                  className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-xl placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isSyncing || !syncIdInput.trim()}
                  className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : "同步"}
                </button>
              </div>
              <p className="text-[10px] text-indigo-200 text-center">
                * 注意：伺服器重啟時資料可能會清空，建議定期匯出備份。
              </p>
            </form>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Weight Input */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              <User className="w-4 h-4 mr-2 text-indigo-600" />
              體重
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                required
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-medium">
                公斤 (kg)
              </span>
            </div>
          </div>

          {/* Goal Multiplier Input */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              <Target className="w-4 h-4 mr-2 text-indigo-600" />
              蛋白質目標
            </label>
            <div className="relative mb-3">
              <input
                type="number"
                step="0.1"
                value={goalMultiplier}
                onChange={(e) => setGoalMultiplier(e.target.value)}
                className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                required
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-medium">
                克 / 公斤 (g/kg)
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              增肌建議：每公斤體重{" "}
              <strong className="text-slate-700">1.6克 至 2.2克</strong>。
              請根據您的活動量和目標進行調整。
            </p>
          </div>

          {/* Calculated Goal Display */}
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-1">
                每日目標
              </h3>
              <p className="text-indigo-700 text-sm">根據您的輸入計算</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-indigo-600">
                {Math.round(
                  parseFloat(weight || "0") * parseFloat(goalMultiplier || "0"),
                )}
              </span>
              <span className="text-indigo-600 font-medium ml-1">克 (g)</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSaved ? (
              <>儲存成功！</>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                儲存個人資料
              </>
            )}
          </button>
        </form>

        {/* InBody Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center text-sm font-semibold text-slate-900 uppercase tracking-wider">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" />
              InBody 歷史紀錄
            </label>
          </div>
          
          {/* InBody History */}
          {inBodyRecords && inBodyRecords.length > 0 ? (
            <div className="space-y-3">
              {inBodyRecords.map((record) => (
                <div key={record.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      {format(record.timestamp, "yyyy/MM/dd")}
                    </span>
                    <button
                      onClick={() => removeInBodyRecord(record.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-white py-2 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">體重</div>
                      <div className="font-semibold text-slate-800">{record.weight} <span className="text-[10px] font-normal text-slate-400">kg</span></div>
                    </div>
                    <div className="bg-white py-2 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">骨骼肌</div>
                      <div className="font-semibold text-slate-800">{record.muscleMass} <span className="text-[10px] font-normal text-slate-400">kg</span></div>
                    </div>
                    <div className="bg-white py-2 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">體脂率</div>
                      <div className="font-semibold text-slate-800">{record.bodyFat} <span className="text-[10px] font-normal text-slate-400">%</span></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-indigo-50/50 px-3 py-2 rounded-lg">
                    <span className="text-indigo-700 font-medium">建議目標</span>
                    <span className="text-indigo-900 font-bold">{record.recommendedMultiplier} g/kg <span className="text-indigo-400 font-normal mx-1">→</span> {Math.round(record.recommendedProtein)}g</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">尚無 InBody 紀錄</p>
          )}
        </div>

        {/* Data Backup & Restore */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="flex items-center text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
            <Database className="w-4 h-4 mr-2 text-indigo-600" />
            資料備份與還原
          </label>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            您的資料目前儲存在此瀏覽器中。如果您想在其他裝置（例如您的手機或家用電腦）上使用，請先「匯出資料」，然後在該裝置上「匯入資料」。
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              匯出資料
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              匯入資料
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
