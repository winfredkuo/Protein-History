import { useState, FormEvent, useRef, ChangeEvent } from "react";
import { useStore } from "../store/useStore";
import { Save, User, Target, Download, Upload, Database, Activity, Trash2, Cloud, LogOut, Loader2, LogIn, AlertTriangle, Camera, Image as ImageIcon, X } from "lucide-react";
import { format } from "date-fns";
import { isFirebaseConfigValid } from "../lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../lib/utils";

import imageCompression from 'browser-image-compression';

export default function ProfilePage() {
  const { profile, updateProfile, records, inBodyRecords, addInBodyRecord, removeInBodyRecord, importData, userId, user, syncWithServer, logout, isSyncing } = useStore();

  const [weight, setWeight] = useState(profile.weight.toString());
  const [goalMultiplier, setGoalMultiplier] = useState(
    profile.goalMultiplier.toString(),
  );
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inBodyPhotoRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // InBody Form State
  const [inBodyWeight, setInBodyWeight] = useState("");
  const [inBodyMuscle, setInBodyMuscle] = useState("");
  const [inBodyFat, setInBodyFat] = useState("");
  const [inBodyPhoto, setInBodyPhoto] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      
      const options = {
        maxSizeMB: 0.1, // Compress to max 100KB to fit in Firestore
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg' as string,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Convert compressed file to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setInBodyPhoto(event.target?.result as string);
        setIsCompressing(false);
      };
      reader.onerror = () => {
        alert("讀取圖片失敗，請重試");
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressedFile);
      
    } catch (error) {
      console.error("Image compression failed:", error);
      alert("圖片處理失敗，請嘗試使用其他照片");
      setIsCompressing(false);
    }
  };

  const handleAddInBody = (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(inBodyWeight);
    const m = parseFloat(inBodyMuscle);
    const f = parseFloat(inBodyFat);

    if (!isNaN(w) && !isNaN(m) && !isNaN(f)) {
      const multiplier = 1.8; // Default
      addInBodyRecord({
        id: uuidv4(),
        timestamp: Date.now(),
        weight: w,
        muscleMass: m,
        bodyFat: f,
        recommendedMultiplier: multiplier,
        recommendedProtein: w * multiplier,
        photoUrl: inBodyPhoto || undefined
      });
      // Reset form
      setInBodyWeight("");
      setInBodyMuscle("");
      setInBodyFat("");
      setInBodyPhoto(null);
    }
  };

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
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center text-sm font-semibold text-slate-900 uppercase tracking-wider">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" />
              新增 InBody 紀錄
            </label>
          </div>

          <form onSubmit={handleAddInBody} className="space-y-4 mb-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">體重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inBodyWeight}
                  onChange={(e) => setInBodyWeight(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">骨骼肌 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inBodyMuscle}
                  onChange={(e) => setInBodyMuscle(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">體脂率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inBodyFat}
                  onChange={(e) => setInBodyFat(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => inBodyPhotoRef.current?.click()}
                disabled={isCompressing}
                className={cn(
                  "flex-1 flex items-center justify-center py-2.5 border-2 border-dashed rounded-xl transition-colors",
                  inBodyPhoto 
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100",
                  isCompressing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    處理圖片中...
                  </>
                ) : inBodyPhoto ? (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    照片已選取
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    上傳 InBody 照片
                  </>
                )}
              </button>
              {inBodyPhoto && (
                <button 
                  type="button"
                  onClick={() => setInBodyPhoto(null)}
                  className="p-2.5 bg-red-50 text-red-500 rounded-xl border border-red-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={inBodyPhotoRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              type="submit"
              disabled={isCompressing}
              className={cn(
                "w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors",
                isCompressing && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCompressing ? "圖片處理中..." : "新增紀錄"}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">歷史紀錄</h3>
            {/* InBody History */}
            {inBodyRecords && inBodyRecords.length > 0 ? (
              <div className="space-y-4">
                {inBodyRecords.map((record) => (
                  <div key={record.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-bold text-slate-900">
                        {format(record.timestamp, "yyyy/MM/dd")}
                      </span>
                      <button
                        onClick={() => removeInBodyRecord(record.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex space-x-4">
                      {record.photoUrl && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                          <img 
                            src={record.photoUrl} 
                            alt="InBody" 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedPhoto(record.photoUrl || null)}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div className="bg-white py-2 rounded-lg border border-slate-100">
                            <div className="text-[10px] text-slate-400 mb-0.5">體重</div>
                            <div className="text-sm font-bold text-slate-800">{record.weight}</div>
                          </div>
                          <div className="bg-white py-2 rounded-lg border border-slate-100">
                            <div className="text-[10px] text-slate-400 mb-0.5">骨骼肌</div>
                            <div className="text-sm font-bold text-slate-800">{record.muscleMass}</div>
                          </div>
                          <div className="bg-white py-2 rounded-lg border border-slate-100">
                            <div className="text-[10px] text-slate-400 mb-0.5">體脂%</div>
                            <div className="text-sm font-bold text-slate-800">{record.bodyFat}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] bg-indigo-50/50 px-3 py-2 rounded-lg">
                          <span className="text-indigo-700 font-medium">建議目標</span>
                          <span className="text-indigo-900 font-bold">{Math.round(record.recommendedProtein)}g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">尚無 InBody 紀錄</p>
            )}
          </div>
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

      {/* Image Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto} 
              alt="InBody Full Size" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
